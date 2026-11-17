"""Create the Next Level automation core in an isolated Blender process."""
import bpy
import math
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parent.parent
assets = root / "public" / "hero"
sources = root / "artifacts" / "hero"
assets.mkdir(parents=True, exist_ok=True)
sources.mkdir(parents=True, exist_ok=True)

# --factory-startup opens an independent scene, never the user's open file.
scene = bpy.context.scene
for obj in list(scene.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
try:
    scene.render.engine = "CYCLES"
except TypeError:
    raise RuntimeError("Cycles is required for the glass studio render")
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.render.resolution_x = 1200
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.world.use_nodes = True
background = next(n for n in scene.world.node_tree.nodes if n.type == "BACKGROUND")
background.inputs[0].default_value = (0.8, 0.9, 1.0, 1)
background.inputs[1].default_value = 0.5

def material(name, color, metallic=0.0, roughness=0.2, transmission=0.0, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    node = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    node.inputs["Base Color"].default_value = (*color, 1)
    node.inputs["Metallic"].default_value = metallic
    node.inputs["Roughness"].default_value = roughness
    node.inputs["IOR"].default_value = 1.45
    node.inputs["Transmission Weight"].default_value = transmission
    node.inputs["Emission Color"].default_value = (*color, 1)
    node.inputs["Emission Strength"].default_value = emission
    return mat

titanium = material("NL / Brushed titanium", (0.08, 0.13, 0.2), 0.92, 0.23)
glass = material("NL / Obsidian optical glass", (0.06, 0.16, 0.23), 0.08, 0.1, 1.0)
cyan = material("NL / Cyan nodes", (0.0, 0.72, 1.0), 0.25, 0.15, emission=5)
blue = material("NL / Electric blue", (0.025, 0.2, 0.8), 0.5, 0.2, emission=2)
white = material("NL / Silver", (0.6, 0.75, 0.9), 0.9, 0.2)
panel_glass = material("NL / Interface glass", (0.13, 0.28, 0.4), 0.5, 0.17, 0.35)
panel_ink = material("NL / Interface ink", (0.012, 0.035, 0.065), 0.5, 0.23)

def smooth(obj, mat, name):
    obj.name = name
    obj.data.materials.append(mat)
    if hasattr(obj.data, "polygons"):
        for face in obj.data.polygons:
            face.use_smooth = True
    return obj

bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.05)
core = bpy.context.object
core.name = "NL / Faceted glass nucleus"
core.rotation_euler = (0.2, 0.1, 0.35)
core.data.materials.append(glass)
bevel = core.modifiers.new("Optical edge bevel", "BEVEL")
bevel.width = 0.018
bevel.segments = 3

bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.45)
smooth(bpy.context.object, blue, "NL / Inner energy core")

rotations = [(math.radians(64), math.radians(18), math.radians(24)),
             (math.radians(18), math.radians(66), math.radians(-20)),
             (math.radians(-48), math.radians(32), math.radians(64))]
ring_objects = []
for index, rotation in enumerate(rotations):
    radius = 1.65 + index * 0.18
    bpy.ops.mesh.primitive_torus_add(major_segments=160, minor_segments=12, major_radius=radius, minor_radius=0.028, rotation=rotation)
    ring = smooth(bpy.context.object, titanium, f"NL / Titanium orbit {index + 1}")
    ring_objects.append(ring)
    bpy.ops.mesh.primitive_torus_add(major_segments=160, minor_segments=8, major_radius=radius + 0.032, minor_radius=0.007, rotation=rotation)
    smooth(bpy.context.object, cyan if index != 1 else blue, f"NL / Light trace {index + 1}")

for index in range(8):
    ring = ring_objects[index % 3]
    angle = index * math.tau / 8 + 0.25
    radius = 1.65 + (index % 3) * 0.18
    local = Vector((radius * math.cos(angle), radius * math.sin(angle), 0))
    point = ring.rotation_euler.to_matrix() @ local
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.09 if index % 2 else 0.12, location=point)
    smooth(bpy.context.object, cyan, f"NL / Automation node {index + 1}")
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.15 if index % 2 else 0.18, location=point)
    shell = smooth(bpy.context.object, white, f"NL / Node socket {index + 1}")
    shell.scale = (1, 1, 0.3)
    shell.rotation_euler = ring.rotation_euler

def box(name, location, scale, mat, bevel_width=0.05):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("Soft interface edges", "BEVEL")
    bevel.width = bevel_width
    bevel.segments = 2
    return obj

# Lightweight orbit modules inspired by the supplied reference: web, AI, growth.
web = box("NL / Web glass panel", (-2.35, -0.15, 0.05), (1.25, 0.10, 0.94), panel_glass)
box("NL / Web title", (-2.35, -0.22, 0.36), (0.94, 0.035, 0.06), cyan, 0.02)
box("NL / Web navigation", (-2.77, -0.23, 0.02), (0.1, 0.035, 0.42), panel_ink, 0.015)
for index in range(3):
    box(f"NL / Web content {index + 1}", (-2.55 + index * 0.27, -0.23, -0.02), (0.21, 0.035, 0.31), white if index == 0 else panel_ink, 0.025)
box("NL / Web CTA", (-2.35, -0.24, -0.30), (0.64, 0.035, 0.07), cyan, 0.02)

box("NL / Analytics platform", (2.2, -0.25, -0.94), (1.3, 0.8, 0.1), panel_glass)
for index in range(5):
    height = 0.12 + index * 0.14
    box(f"NL / Growth bar {index + 1}", (1.73 + index * 0.22, -0.27, -0.88 + height / 2), (0.12, 0.18, height), cyan if index > 2 else titanium, 0.025)

for index, location in enumerate([(1.85, 0.12, 1.85), (2.45, 0.12, 1.26), (1.25, 0.12, 1.26)]):
    box(f"NL / Automation module {index + 1}", location, (0.4, 0.17, 0.28), panel_glass)
    box(f"NL / Automation indicator {index + 1}", (location[0], location[1] - 0.1, location[2]), (0.22, 0.035, 0.05), cyan, 0.02)

def trail(name, coords):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 12
    curve.bevel_depth = 0.009
    curve.bevel_resolution = 2
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(coords) - 1)
    for point, co in zip(spline.bezier_points, coords):
        point.co = co
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    scene.collection.objects.link(obj)
    obj.data.materials.append(cyan)

trail("NL / Web connection", [(0, 0, 0), (-0.9, -0.5, -0.3), (-1.7, -0.2, -0.1), (-2, -0.2, 0)])
trail("NL / Analytics connection", [(0, 0.1, 0), (0.9, -0.4, -0.7), (1.65, -0.5, -0.6), (2.2, -0.3, -0.6)])
trail("NL / Automation connection", [(0, 0, 0), (0.7, 0.3, 0.9), (1.65, 0.1, 1.2), (1.85, 0.12, 1.85)])
trail("NL / Workflow branch A", [(1.85, 0.12, 1.7), (1.85, 0.12, 1.5), (2.45, 0.12, 1.26)])
trail("NL / Workflow branch B", [(1.85, 0.12, 1.5), (1.25, 0.12, 1.26)])

def point_at(obj, target=(0, 0, 0)):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()

for name, loc, color, energy, size in [
    ("Cyan key", (3, -4, 5), (0.18, 0.7, 1), 950, 4),
    ("Violet rim", (-4, 1, 3), (0.4, 0.25, 1), 1150, 3),
    ("Cool white softbox", (0, 1, 5), (0.8, 0.9, 1), 1400, 3),
    ("Front reflection", (0, -5, 0), (0.3, 0.65, 1), 400, 2),
]:
    data = bpy.data.lights.new(name, type="AREA")
    data.energy = energy
    data.color = color
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = loc
    point_at(obj)

camera_data = bpy.data.cameras.new("NL Hero Camera")
camera = bpy.data.objects.new("NL Hero Camera", camera_data)
scene.collection.objects.link(camera)
camera.location = (4.5, -10, 3.7)
point_at(camera)
camera_data.type = "ORTHO"
camera_data.ortho_scale = 7.5
scene.camera = camera

# Export editable source/model separately; the landing serves the small render.
bpy.ops.wm.save_as_mainfile(filepath=str(sources / "nextlevel-core.blend"))
bpy.ops.export_scene.gltf(filepath=str(assets / "nextlevel-core.glb"), export_format="GLB", use_selection=False, export_cameras=False, export_lights=False)
formats = [entry.identifier for entry in scene.render.image_settings.bl_rna.properties["file_format"].enum_items]
scene.render.image_settings.file_format = "WEBP" if "WEBP" in formats else "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.quality = 90
suffix = ".webp" if scene.render.image_settings.file_format == "WEBP" else ".png"
scene.render.filepath = str(assets / ("nextlevel-core" + suffix))
bpy.ops.render.render(write_still=True)
print("NL_HERO_RENDER=" + scene.render.filepath)
