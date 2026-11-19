"""Refine the existing ecosystem in an isolated Blender process, preserving its modules."""
import bpy
import re
from pathlib import Path

if not bpy.app.background:
    raise RuntimeError('Run with --background --factory-startup; never change an interactive scene.')
root = Path(__file__).resolve().parents[1]
assets = root / 'public' / 'hero'
for obj in list(bpy.context.scene.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(assets / 'nextlevel-core.glb'))
normalized = lambda value: re.sub('[^a-z0-9]', '', value.lower())
old = next(obj for obj in bpy.context.scene.objects if any(key in normalized(obj.name) for key in ['facetedglassnucleus', 'dynamicglassnucleus']))
matrix = old.matrix_world.copy()
parent = old.parent
for obj in list(bpy.context.scene.objects):
    if any(key in normalized(obj.name) for key in ['facetedglassnucleus', 'dynamicglassnucleus', 'innerenergycore']):
        bpy.data.objects.remove(obj, do_unlink=True)

glass = bpy.data.materials.get('NL / Dynamic optical glass') or bpy.data.materials.new('NL / Dynamic optical glass')
glass.use_nodes = True
node = next(node for node in glass.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
for key, value in {'Base Color': (.025, .13, .24, 1), 'Metallic': .12, 'Roughness': .09, 'IOR': 1.45, 'Transmission Weight': .85, 'Coat Weight': .55, 'Coat Roughness': .08}.items():
    node.inputs[key].default_value = value
bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=32, radius=1.23)
core = bpy.context.object
core.name = 'NL / Dynamic glass nucleus'
core.parent = parent
core.matrix_world = matrix
core.data.materials.append(glass)
for face in core.data.polygons:
    face.use_smooth = True
core['visual_reference'] = 'Smooth optical sphere with animated energy filaments and orbital particles; original geometry, no stock footage embedded.'
scene = bpy.context.scene
source = root / 'artifacts' / 'hero' / 'nextlevel-dynamic-core.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(source))
bpy.ops.export_scene.gltf(filepath=str(assets / 'nextlevel-core.glb'), export_format='GLB', use_selection=False, export_cameras=False, export_lights=False)
meshes = [obj for obj in scene.objects if obj.type == 'MESH']
print('DYNAMIC_HERO', len(meshes), 'meshes', sum(sum(len(face.vertices) - 2 for face in obj.data.polygons) for obj in meshes), 'triangles', (assets / 'nextlevel-core.glb').stat().st_size, 'bytes')
