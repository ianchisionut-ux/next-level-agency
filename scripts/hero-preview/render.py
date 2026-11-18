"""Isolated import of the current GLB; never read or save the user's Blender scene."""
import bpy
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

if not bpy.app.background:
    raise RuntimeError("Run this generator with Blender --background --factory-startup; do not run it in an interactive scene.")

root = Path(__file__).resolve().parents[2]
assets = root / "public" / "hero"
golden = json.loads(subprocess.check_output(["node", str(Path(__file__).with_name("projection.mjs"))], cwd=root, text=True))
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(assets / "nextlevel-core.glb"))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
points = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices]
minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
cx, cy, cz = golden["normalization"]["center"]
center = Vector((cx, -cz, cy))
scale = golden["normalization"]["scale"]
group = bpy.data.objects.new("Current runtime normalization", None)
bpy.context.scene.collection.objects.link(group)
for obj in list(bpy.context.scene.objects):
    if obj != group and obj.parent is None:
        obj.parent = group
group.scale = (scale,) * 3
group.location = -center * scale
bpy.context.view_layer.update()
points = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices]
radius = max(point.length for point in points) * 1.025
assert abs(radius - golden["radius"]) < .0001, (radius, golden["radius"])

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.image_settings.file_format = "WEBP"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.quality = 90
scene.render.resolution_percentage = 100
scene.world.use_nodes = True
world = next(node for node in scene.world.node_tree.nodes if node.type == "BACKGROUND")
world.inputs[0].default_value = (.8, .9, 1, 1)
world.inputs[1].default_value = .5

def point_at(obj):
    obj.rotation_euler = (-obj.location).to_track_quat("-Z", "Y").to_euler()

for name, position, color, energy, size in [
    ("Runtime white studio", (4, -4, 6), (1, 1, 1), 1100, 4),
    ("Runtime cyan", (-2, -2.5, 1.5), (.13, .83, .94), 400, 3),
    ("Runtime blue rim", (-3, 2, 2), (.6, .73, 1), 900, 3),
]:
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.color, data.size = energy, color, size
    light = bpy.data.objects.new(name, data)
    scene.collection.objects.link(light)
    light.location = position
    point_at(light)

camera_data = bpy.data.cameras.new("Current runtime perspective")
camera_data.type = "PERSP"
camera_data.sensor_fit = "VERTICAL"
camera_data.sensor_height = 32
camera_data.lens = 32 / (2 * math.tan(math.radians(golden["fov"]) / 2))
camera_data.clip_start, camera_data.clip_end = .1, 200
camera = bpy.data.objects.new("Current runtime perspective", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera

original_transmission = {}
for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    for node in material.node_tree.nodes:
        if node.type != "BSDF_PRINCIPLED":
            continue
        original_transmission[material.name] = node.inputs["Transmission Weight"].default_value
        emission = node.inputs["Emission Color"].default_value
        strength = node.inputs["Emission Strength"]
        peak = max(emission[:3]) * strength.default_value
        if peak > 2.3:
            strength.default_value *= 2.3 / peak

def pixel(point):
    coordinate = world_to_camera_view(scene, camera, point)
    return (coordinate.x * scene.render.resolution_x, (1 - coordinate.y) * scene.render.resolution_y)

def normalized(name):
    return re.sub("[^a-z0-9]", "", name.lower())

metadata = {key: golden[key] for key in ["modelSha256", "framingSha256", "fov", "radius"]}
metadata.update({"renderer": "Blender Cycles", "cameraType": "perspective", "cameraDirectionThree": [3, 1.7, 6.9], "frames": []})
for frame in golden["frames"]:
    scene.render.resolution_x, scene.render.resolution_y = frame["width"], frame["height"]
    x, y, z = frame["camera"]
    camera.location = (x, -z, y)
    point_at(camera)
    camera_data.shift_x = frame["framing"]["offsetX"] / frame["height"]
    camera_data.shift_y = -frame["framing"]["offsetY"] / frame["height"]
    for material in bpy.data.materials:
        if material.name not in original_transmission:
            continue
        for node in material.node_tree.nodes:
            if node.type == "BSDF_PRINCIPLED":
                node.inputs["Transmission Weight"].default_value = min(original_transmission[material.name], frame["transmission"])
    bpy.context.view_layer.update()
    checks = [(pixel(Vector()), frame["origin"])]
    for name, expected in frame["anchors"].items():
        obj = next(obj for obj in meshes if normalized(obj.name) == normalized(name))
        checks.append((pixel(obj.matrix_world.translation), expected))
    projected = [pixel(point) for point in points]
    actual_bounds = [min(p[0] for p in projected), min(p[1] for p in projected), max(p[0] for p in projected), max(p[1] for p in projected)]
    error = max([math.dist(actual, expected) for actual, expected in checks] + [abs(a - b) for a, b in zip(actual_bounds, frame["bounds"])])
    assert error < .2, (frame["name"], error, checks, actual_bounds, frame["bounds"])
    asset = f"nextlevel-core-runtime-{frame['name']}.webp"
    scene.render.filepath = str(assets / asset)
    bpy.ops.render.render(write_still=True)
    content = (assets / asset).read_bytes()
    metadata["frames"].append({"name": frame["name"], "asset": f"/hero/{asset}", "width": frame["width"], "height": frame["height"], "wide": frame["wide"], "transmission": frame["transmission"], "projectionErrorPx": error, "bounds": actual_bounds, "sha256": hashlib.sha256(content).hexdigest(), "bytes": len(content)})
    print("RUNTIME_PREVIEW=" + json.dumps(metadata["frames"][-1]), flush=True)
(assets / "nextlevel-core-runtime-poster.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf8")
print("RUNTIME_PREVIEW_COMPLETE", flush=True)
