# Renders lineups of every model in models.blend into art-src/blender/renders/ (git-ignored) for review.
#
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b art-src/blender/models.blend --python art-src/blender/preview.py [-- group ...]
#
# Groups: trees, people, rides, scenery, park (mixed scene at game scale). Views per group: front (low perspective),
# iso (30 deg elevation, orthographic, like the game camera) and back (iso from behind).
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'renders'); os.makedirs(OUT, exist_ok=True)
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

sc = bpy.context.scene
ENGINE = 'WORKBENCH' if 'workbench' in args else 'EEVEE'
args = [a for a in args if a != 'workbench']
sc.render.resolution_x, sc.render.resolution_y = 1600, 900
sc.view_settings.view_transform = 'Standard'
if not sc.world: sc.world = bpy.data.worlds.new('w')
if ENGINE == 'EEVEE':
    sc.render.engine = 'BLENDER_EEVEE'
    sc.eevee.taa_render_samples = 24
    w = sc.world; w.use_nodes = True
    bg = w.node_tree.nodes.get('Background'); bg.inputs['Color'].default_value = (0.55, 0.65, 0.8, 1); bg.inputs['Strength'].default_value = 0.75
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 2.6; sun.data.angle = math.radians(6); sun.data.color = (1.0, 0.96, 0.9)
    sun.rotation_euler = (math.radians(42), 0, math.radians(35))
    mat = bpy.data.materials.get('vcol') or bpy.data.materials.new('vcol'); mat.use_nodes = True
    nt = mat.node_tree; bsdf = nt.nodes.get('Principled BSDF')
    att = nt.nodes.new('ShaderNodeAttribute'); att.attribute_name = 'Col'
    nt.links.new(att.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.85
    if 'Specular IOR Level' in bsdf.inputs: bsdf.inputs['Specular IOR Level'].default_value = 0.2
else:
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading
    sh.light = 'STUDIO'; sh.color_type = 'VERTEX'
    sh.show_shadows = True; sh.shadow_intensity = 0.45
    sc.display.light_direction = (0.45, -0.35, 0.82)
    sc.world.color = (0.62, 0.70, 0.78)

M = {o.name: o for o in bpy.data.collections['models'].objects}

# ground plane with its own vertex colour
gm = bpy.data.meshes.new('ground'); bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=60); bm.to_mesh(gm); bm.free()
ca = gm.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
for d in ca.data: d.color_srgb = (0.58, 0.66, 0.44, 1)
ground = bpy.data.objects.new('ground', gm); sc.collection.objects.link(ground)
if bpy.data.materials.get('vcol'): gm.materials.append(bpy.data.materials['vcol'])

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam

GROUPS = {
    'trees': ['pine_a', 'pine_b', 'pine_c', 'oak_a', 'oak_b', 'redbud_a', 'redbud_b', 'dogwood_a', 'dogwood_b'],
    'people': ['person', 'person_sit', 'bear', 'bear_statue'],
    'rides': ['horse', 'teacup', 'log_boat', 'coaster_car_lead', 'coaster_car', 'tube'],
    'scenery': ['rock_a', 'rock_b', 'rock_c', 'stump', 'log_pile', 'ore_cart'],
    'horse': ['horse'],
    'bear': ['bear'],
}

def bbox(o):
    cs = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return Vector([min(c[i] for c in cs) for i in range(3)]), Vector([max(c[i] for c in cs) for i in range(3)])

def layout(names, gap):
    x = 0.0; objs = []
    for n in names:
        o = M[n]; o.location = (0, 0, 0); o.rotation_euler = (0, 0, 0); bpy.context.view_layer.update()
        lo, hi = bbox(o)
        o.location = (x - lo.x, 0, 0.16 if n == 'person_sit' else 0.0)
        x += (hi.x - lo.x) + gap; objs.append(o)
    for o in objs: o.location.x -= (x - gap) / 2
    return objs

def frame(objs, az, el, ortho, margin=1.12, lens=60):
    a, e = math.radians(az), math.radians(el)
    d = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))   # camera direction from target
    rot = (-d).to_track_quat('-Z', 'Y'); R = rot.to_matrix()
    bpy.context.view_layer.update()
    pts = []
    for o in objs:
        lo, hi = bbox(o)
        pts += [Vector((x, y, z)) for x in (lo.x, hi.x) for y in (lo.y, hi.y) for z in (lo.z, hi.z)]
    Ri = R.inverted()
    loc = [Ri @ p for p in pts]
    cx = (min(p.x for p in loc) + max(p.x for p in loc)) / 2; cy = (min(p.y for p in loc) + max(p.y for p in loc)) / 2
    w = max(p.x for p in loc) - min(p.x for p in loc); h = max(p.y for p in loc) - min(p.y for p in loc)
    aspect = sc.render.resolution_x / sc.render.resolution_y
    span = max(w, h * aspect) * margin
    centre = R @ Vector((cx, cy, sum(p.z for p in loc) / len(loc)))
    cam.rotation_euler = rot.to_euler()
    if ortho:
        cam.data.type = 'ORTHO'; cam.data.ortho_scale = span
        cam.location = centre + d * 60
    else:
        cam.data.type = 'PERSP'; cam.data.lens = lens
        fov = 2 * math.atan(cam.data.sensor_width / 2 / lens)
        cam.location = centre + d * (span / 2 / math.tan(fov / 2) + max(w, h) * 0.3)
    cam.data.clip_end = 500

def shoot(fname):
    sc.render.filepath = os.path.join(OUT, fname); bpy.ops.render.render(write_still=True)
    print('wrote', fname)

def hide_all_but(objs):
    for o in M.values(): o.hide_render = o not in objs

VIEWS = [('front', 0, 8, False), ('iso', 40, 30, True), ('back', 205, 30, True)]
want = args or list(GROUPS) + ['park']
for g, names in GROUPS.items():
    if g not in want: continue
    objs = layout(names, gap={'trees': 0.5, 'people': 0.15, 'rides': 0.2, 'scenery': 0.2}.get(g, 0.2))
    hide_all_but(objs)
    for v, az, el, ortho in VIEWS:
        for o in objs: o.rotation_euler = (0, 0, -math.radians(az))
        bpy.context.view_layer.update()
        frame(objs, 0, el, ortho); shoot('%s-%s.png' % (g, v))
    for o in objs: o.rotation_euler = (0, 0, 0)

if 'park' in want:
    # a small park corner at game scale: trees, rocks and guests, seen from the 30 deg iso camera
    place = [('pine_a', -3.0, 1.5, 0), ('pine_b', -1.6, 2.6, 1.0), ('pine_c', 0.4, 2.2, 2.0), ('oak_a', 2.6, 2.0, 0.5),
             ('oak_b', 4.6, 3.0, 2.2), ('redbud_a', -0.6, 0.2, 0.3), ('dogwood_a', 1.6, -0.2, 1.2), ('redbud_b', 4.0, 0.4, 2.5),
             ('dogwood_b', -2.4, -0.6, 0.7), ('rock_a', 0.0, -1.3, 0.4), ('rock_b', 3.0, -1.4, 1.9), ('rock_c', -1.2, -1.8, 2.4),
             ('stump', 1.0, -2.0, 0), ('log_pile', -3.3, -2.0, 0.3), ('person', 0.8, -2.8, 0.3), ('bear', 1.4, -2.9, -0.4),
             ('bear_statue', 2.2, -2.6, 0.2), ('ore_cart', -0.8, -3.0, 1.57), ('person_sit', -1.6, -3.2, 0)]
    objs = []
    for n, x, y, r in place:
        o = M[n]; o.location = (x, y, 0); o.rotation_euler = (0, 0, r); objs.append(o)
    hide_all_but(objs)
    for v, az, el in (('iso', 40, 30), ('iso2', -60, 30)):
        frame(objs, az, el, True, margin=1.02); shoot('park-%s.png' % v)
