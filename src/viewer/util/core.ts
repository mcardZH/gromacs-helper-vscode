import { BuiltInTrajectoryFormat } from "molstar/lib/mol-plugin-state/formats/trajectory";
import { BuiltInTopologyFormat } from 'molstar/lib/mol-plugin-state/formats/topology';
import { BuiltInCoordinatesFormat } from 'molstar/lib/mol-plugin-state/formats/coordinates';
import { PresetTrajectoryHierarchy } from 'molstar/lib/mol-plugin-state/builder/structure/hierarchy-preset';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { StateObjectSelector } from 'molstar/lib/mol-state';
import { TrajectoryFromModelAndCoordinates } from 'molstar/lib/mol-plugin-state/transforms/model';


export interface LoadTrajectoryParams {
    model: { kind: 'model-url', url: string, format?: BuiltInTrajectoryFormat /* mmcif */, isBinary?: boolean }
    | { kind: 'model-data', data: string | number[] | ArrayBuffer | Uint8Array<ArrayBuffer>, format?: BuiltInTrajectoryFormat /* mmcif */ }
    | { kind: 'topology-url', url: string, format: BuiltInTopologyFormat, isBinary?: boolean }
    | { kind: 'topology-data', data: string | number[] | ArrayBuffer | Uint8Array<ArrayBuffer>, format: BuiltInTopologyFormat },
    modelLabel?: string,
    coordinates: { kind: 'coordinates-url', url: string, format: BuiltInCoordinatesFormat, isBinary?: boolean }
    | { kind: 'coordinates-data', data: string | number[] | ArrayBuffer | Uint8Array<ArrayBuffer>, format: BuiltInCoordinatesFormat },
    coordinatesLabel?: string,
    preset?: keyof PresetTrajectoryHierarchy
}

/**
     * @example
     *  viewer.loadTrajectory(ui, {
     *      model: { kind: 'model-url', url: 'villin.gro', format: 'gro' },
     *      coordinates: { kind: 'coordinates-url', url: 'villin.xtc', format: 'xtc', isBinary: true },
     *      preset: 'all-models' // or 'default'
     *  });
     */
export async function loadTrajectory(ui: PluginUIContext, params: LoadTrajectoryParams) {
    const plugin = ui;

    let model: StateObjectSelector;

    if (params.model.kind === 'model-data' || params.model.kind === 'model-url') {
        const data = params.model.kind === 'model-data'
            ? await plugin.builders.data.rawData({ data: params.model.data, label: params.modelLabel })
            : await plugin.builders.data.download({ url: params.model.url, isBinary: params.model.isBinary, label: params.modelLabel });

        const trajectory = await plugin.builders.structure.parseTrajectory(data, params.model.format ?? 'mmcif');
        model = await plugin.builders.structure.createModel(trajectory);
    } else {
        const data = params.model.kind === 'topology-data'
            ? await plugin.builders.data.rawData({ data: params.model.data, label: params.modelLabel })
            : await plugin.builders.data.download({ url: params.model.url, isBinary: params.model.isBinary, label: params.modelLabel });

        const provider = plugin.dataFormats.get(params.model.format);
        const parsed = await provider!.parse(plugin, data);
        model = parsed.topology;
    }

    const data = params.coordinates.kind === 'coordinates-data'
        ? await plugin.builders.data.rawData({ data: params.coordinates.data, label: params.coordinatesLabel })
        : await plugin.builders.data.download({ url: params.coordinates.url, isBinary: params.coordinates.isBinary, label: params.coordinatesLabel });

    const provider = plugin.dataFormats.get(params.coordinates.format);
    const coords = await provider!.parse(plugin, data);

    const trajectory = await plugin.build().toRoot()
        .apply(TrajectoryFromModelAndCoordinates, {
            modelRef: model.ref,
            coordinatesRef: coords.ref
        }, { dependsOn: [model.ref, coords.ref] })
        .commit();

    const preset = await plugin.builders.structure.hierarchy.applyPreset(trajectory, params.preset ?? 'default');

    return { model, coords, preset };
}

export async function loadStreamingTrajectory(
    ui: PluginUIContext,
    params: {
        topologyUrl: string;
        topologyFormat: BuiltInTopologyFormat | BuiltInTrajectoryFormat;
        topologyLabel?: string;
        frameCount: number;
        duration: number;
        vscode: { postMessage(message: unknown): void; };
    }
) {
    console.log('[loadStreamingTrajectory] Starting with params:', {
        topologyFormat: params.topologyFormat,
        frameCount: params.frameCount,
        duration: params.duration
    });

    const plugin = ui;

    // 1. Set global VS Code API for StreamingTrajectory
    console.log('[loadStreamingTrajectory] Setting global VS Code API...');
    const { setGlobalVsCodeApi, StreamingTrajectoryFromTopology } = await import('./trajectory');
    setGlobalVsCodeApi(params.vscode);

    // 2. Load and parse topology file
    console.log('[loadStreamingTrajectory] Downloading topology file...');
    const topologyData = await plugin.builders.data.download({
        url: params.topologyUrl,
        isBinary: false,
        label: params.topologyLabel
    });

    let model: StateObjectSelector;

    // Try as trajectory format first (GRO, PDB, etc.)
    const trajectoryFormats: BuiltInTrajectoryFormat[] = ['gro', 'pdb', 'mmcif', 'mol', 'mol2', 'sdf'];
    if (trajectoryFormats.includes(params.topologyFormat as BuiltInTrajectoryFormat)) {
        console.log('[loadStreamingTrajectory] Parsing as trajectory format:', params.topologyFormat);
        const trajectory = await plugin.builders.structure.parseTrajectory(
            topologyData,
            params.topologyFormat as BuiltInTrajectoryFormat
        );
        model = await plugin.builders.structure.createModel(trajectory);
    } else {
        console.log('[loadStreamingTrajectory] Parsing as topology format:', params.topologyFormat);
        // Try as topology format (PSF, TOP, PRMTOP)
        const provider = plugin.dataFormats.get(params.topologyFormat);
        if (!provider) {
            throw new Error(`Unsupported topology format: ${params.topologyFormat}`);
        }
        const parsed = await provider.parse(plugin, topologyData);
        model = parsed.topology;
    }

    // 3. Get the representative Model from the topology (for logging)
    console.log('[loadStreamingTrajectory] Getting representative model...');
    const modelObj = model.data;
    if (!modelObj) {
        throw new Error('Failed to load topology model');
    }
    console.log('[loadStreamingTrajectory] Model loaded, atom count:', modelObj.atomicHierarchy.atoms._rowCount);

    // 4. Create StreamingTrajectory using StateTransformer with dependsOn
    console.log('[loadStreamingTrajectory] Creating streaming trajectory via StateTransformer...');
    const trajectory = await plugin.build().toRoot()
        .apply(StreamingTrajectoryFromTopology, {
            modelRef: model.ref,
            frameCount: params.frameCount,
            duration: params.duration,
        }, { dependsOn: [model.ref] })
        .commit();

    console.log('[loadStreamingTrajectory] Trajectory StateObject created');

    // 5. Apply trajectory hierarchy preset (this creates Model -> Structure -> Representations)
    console.log('[loadStreamingTrajectory] Applying trajectory hierarchy preset...');
    const preset = await plugin.builders.structure.hierarchy.applyPreset(
        trajectory,
        'default'
    );

    console.log('[loadStreamingTrajectory] Complete!');
    return { model, trajectory, preset };
}