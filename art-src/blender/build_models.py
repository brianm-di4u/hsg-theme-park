# Ouachita theme park: low-poly stylized models, built procedurally in Blender and exported for three.js.
#
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --factory-startup --python games/theme-park/art-src/blender/build_models.py
#
# Every model is built from scratch (bmesh primitives, lofts, lathes, plane cuts, plus Remesh / Displace /
# Decimate / Boolean modifiers that are applied), painted per face (region + baked sRGB base colour), saved to
# art-src/blender/models.blend (one object per model, collection "models") and written to assets/models.js as
# non-indexed triangle lists. Units: 1 Blender unit = 1 game tile (~3 m). Origin at the base centre, front = -Y.
# Export maps Blender (x, y, z) -> three.js (x, z, -y).
import bpy, bmesh, math, random, os, json, base64, struct
from mathutils import Vector, Matrix, noise

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT_JS = os.path.join(GAME, 'assets', 'models.js')
BLEND = os.path.join(HERE, 'models.blend')

bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene
SCRATCH = bpy.data.collections.new('scratch'); SC.collection.children.link(SCRATCH)
OUTC = bpy.data.collections.new('models'); SC.collection.children.link(OUTC)

# ------------------------------------------------------------------ colours (sRGB 0..255)
def H(h):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
def shade(c, k): return tuple(max(0, min(255, int(round(v * k)))) for v in c)
def mixc(a, b, t): return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))

C = dict(
    bark=H('#6B4A35'), bark_dk=H('#56392A'), needle=H('#3D6B3A'), needle_dk=H('#2E5A33'),
    oak=H('#5E8A42'), oak_dk=H('#4E7A3A'), redbud_leaf=H('#6A9446'), redbud=H('#C2589A'),
    dogwood_leaf=H('#5A8A44'), dogwood=H('#F2F0E6'), hard_bark=H('#6E5A4A'),
    skin=H('#E8B990'), shirt=H('#3FBFB5'), pants=H('#34424A'), shoes=H('#2A2A2A'), hair=H('#4A3020'),
    fur=H('#2A2420'), muzzle=H('#B08A60'), vest=H('#B8342E'), eye=H('#0E0C0B'),
    carved=H('#4E3626'), carved_lt=H('#6E4E34'), plinth=H('#6B4A35'), plinth_cut=H('#C49A6C'),
    horse=H('#F3EEE4'), mane=H('#4A3428'), gold=H('#D9A93C'),
    cup=H('#E2768C'), cup_trim=H('#F6EBD2'), cup_in=H('#F3ECDD'), wheel=H('#D9B45A'),
    log=H('#7A5236'), log_in=H('#B98B5D'), log_end=H('#CFA673'), bench=H('#9A6E46'),
    car=H('#C8352E'), seat=H('#2C2C36'), metal=H('#9AA0A6'), metal_dk=H('#4A4E54'),
    tube=H('#F2A93B'), handle=H('#2F4F6F'),
    novac=H('#D8D4CC'), lichen=H('#9AA27A'), sand=H('#A08A6A'), moss=H('#8A9460'),
    stump_cut=H('#C9A27A'), cut=H('#D2AE80'), cut_dk=H('#B48A5E'),
    iron=H('#7A4B35'), iron_dk=H('#5E3A2A'), rail=H('#55575C'), tie=H('#5A4535'), ore=H('#7D746A'),
    quartz=H('#ECEAE4'),
)

# ------------------------------------------------------------------ geometry helpers (all write into a bmesh)
def V(*a): return Vector(a if len(a) == 3 else a[0])

def tube(bm, pts, radii, sides=6, caps=(True, True), phase=0.0, ref=(1, 0, 0)):
    """Tube along a polyline. radius per point: r or (ru, rv); u starts as `ref` (default X = width),
    v = tangent x u. Radius 0 collapses that ring to a point (a tip)."""
    P = [Vector(p) for p in pts]; n = len(P)
    if isinstance(radii, (int, float)): radii = [radii] * n
    R = [(r, r) if isinstance(r, (int, float)) else r for r in radii]
    T = [(P[min(i + 1, n - 1)] - P[max(i - 1, 0)]).normalized() for i in range(n)]
    u = Vector(ref)
    if abs(u.dot(T[0])) > 0.95: u = Vector((0, 0, 1))
    rings = []
    for i in range(n):
        u = (u - T[i] * u.dot(T[i])).normalized(); v = T[i].cross(u)
        ru, rv = R[i]
        if ru < 1e-6: rings.append([bm.verts.new(P[i])]); continue
        rings.append([bm.verts.new(P[i] + u * (ru * math.cos(a)) + v * (rv * math.sin(a)))
                      for a in [2 * math.pi * k / sides + phase for k in range(sides)]])
    faces = []
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1: continue
        if len(a) == 1:
            for k in range(sides): faces.append(bm.faces.new((a[0], b[k], b[(k + 1) % sides])))
        elif len(b) == 1:
            for k in range(sides): faces.append(bm.faces.new((a[k], a[(k + 1) % sides], b[0])))
        else:
            for k in range(sides): faces.append(bm.faces.new((a[k], a[(k + 1) % sides], b[(k + 1) % sides], b[k])))
    if caps[0] and len(rings[0]) > 2: faces.append(bm.faces.new(list(reversed(rings[0]))))
    if caps[1] and len(rings[-1]) > 2: faces.append(bm.faces.new(rings[-1]))
    return faces

def ellipsoid(bm, c, r, seg=8, rings=4, rot=None, phase=0.0, zclip=None):
    c = Vector(c); M = rot or Matrix.Identity(3)
    def pt(x, y, z):
        p = Vector((x * r[0], y * r[1], z * r[2]))
        if zclip is not None and p.z < zclip: p.z = zclip
        return M @ p + c
    top = bm.verts.new(pt(0, 0, 1)); bot = bm.verts.new(pt(0, 0, -1))
    lat = []
    for i in range(1, rings):
        t = math.pi * i / rings; z = math.cos(t); s = math.sin(t)
        lat.append([bm.verts.new(pt(s * math.cos(2 * math.pi * k / seg + phase), s * math.sin(2 * math.pi * k / seg + phase), z)) for k in range(seg)])
    for k in range(seg):
        bm.faces.new((top, lat[0][k], lat[0][(k + 1) % seg]))
        bm.faces.new((bot, lat[-1][(k + 1) % seg], lat[-1][k]))
    for a, b in zip(lat, lat[1:]):
        for k in range(seg): bm.faces.new((a[k], b[k], b[(k + 1) % seg], a[(k + 1) % seg]))

def octa(bm, c, r, rot=None):
    c = Vector(c); M = rot or Matrix.Identity(3)
    vs = [bm.verts.new(M @ Vector(p) + c) for p in ((r[0], 0, 0), (-r[0], 0, 0), (0, r[1], 0), (0, -r[1], 0), (0, 0, r[2]), (0, 0, -r[2]))]
    for a, b in ((0, 2), (2, 1), (1, 3), (3, 0)):
        bm.faces.new((vs[a], vs[b], vs[4])); bm.faces.new((vs[b], vs[a], vs[5]))

def box(bm, c, s, rot=None, skip=(), taper=None):
    """Axis box centre c, full size s. skip: subset of {'top','bottom'}; taper=(kx, ky) scales the top face."""
    c = Vector(c); M = rot or Matrix.Identity(3)
    hx, hy, hz = s[0] / 2, s[1] / 2, s[2] / 2
    vs = []
    for z in (-hz, hz):
        kx, ky = (taper if (taper and z > 0) else (1, 1))
        for x, y in ((-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy)):
            vs.append(bm.verts.new(M @ Vector((x * kx, y * ky, z)) + c))
    b, t = vs[:4], vs[4:]
    if 'bottom' not in skip: bm.faces.new(list(reversed(b)))
    if 'top' not in skip: bm.faces.new(t)
    for k in range(4): bm.faces.new((b[k], b[(k + 1) % 4], t[(k + 1) % 4], t[k]))

def lathe(bm, prof, seg, phase=0.0):
    rings = []
    for r, z in prof:
        if r < 1e-6: rings.append([bm.verts.new((0, 0, z))])
        else: rings.append([bm.verts.new((r * math.cos(2 * math.pi * k / seg + phase), r * math.sin(2 * math.pi * k / seg + phase), z)) for k in range(seg)])
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1:
            for k in range(seg): bm.faces.new((a[0], b[k], b[(k + 1) % seg]))
        elif len(b) == 1:
            for k in range(seg): bm.faces.new((a[k], a[(k + 1) % seg], b[0]))
        else:
            for k in range(seg): bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))

def rrect(w, l, rc, npc):
    """Rounded rectangle (half-width w along X, half-length l along Y), corner radius rc, npc points per corner."""
    pts = []
    for cx, cy, a0 in ((w - rc, -l + rc, -90), (w - rc, l - rc, 0), (-w + rc, l - rc, 90), (-w + rc, -l + rc, 180)):
        for i in range(npc):
            a = math.radians(a0 + (90 * i / (npc - 1) if npc > 1 else 45))
            pts.append((cx + rc * math.cos(a), cy + rc * math.sin(a)))
    return pts

def ring_loft(bm, rings, caps=(True, True)):
    """rings: list of [(x, y, z)...] with equal counts, connected in order."""
    R = [[bm.verts.new(p) for p in ring] for ring in rings]; n = len(R[0])
    for a, b in zip(R, R[1:]):
        for k in range(n): bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
    if caps[0]: bm.faces.new(list(reversed(R[0])))
    if caps[1]: bm.faces.new(R[-1])

# ------------------------------------------------------------------ modifier pipeline
TEXN = [0]
def noise_tex(scale, kind='CLOUDS', depth=1):
    TEXN[0] += 1
    t = bpy.data.textures.new('noise%d' % TEXN[0], kind)
    t.noise_scale = scale
    if hasattr(t, 'noise_depth'): t.noise_depth = depth
    return t

def offset_empty(seed):
    rng = random.Random(seed * 7919 + 13)
    e = bpy.data.objects.new('nofs%d' % seed, None); SCRATCH.objects.link(e)
    e.location = (rng.uniform(-50, 50), rng.uniform(-50, 50), rng.uniform(-50, 50))
    return e

def tri_count(me): return sum(len(p.vertices) - 2 for p in me.polygons)

def to_obj(bm, name='part'):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); SCRATCH.objects.link(ob); return ob

def eval_into(ob):
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    new = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    ob.modifiers.clear(); old = ob.data; ob.data = new; bpy.data.meshes.remove(old)

def run_mods(ob, mods):
    for typ, kw in mods:
        kw = dict(kw)
        target = kw.pop('target', None)
        if typ == 'DECIMATE' and target:
            base = ob.data.copy(); n0 = tri_count(base); ratio = min(1.0, target / max(1, n0))
            for _ in range(6):
                ob.data = base.copy()
                m = ob.modifiers.new('m', typ); m.decimate_type = 'COLLAPSE'; m.use_collapse_triangulate = True; m.ratio = ratio
                eval_into(ob); n = tri_count(ob.data)
                if n <= target or ratio < 1e-4: break
                ratio *= target / n * 0.98
            bpy.data.meshes.remove(base)
            continue
        m = ob.modifiers.new('m', typ)
        for k, v in kw.items(): setattr(m, k, v)
        eval_into(ob)

# ------------------------------------------------------------------ models
class Model:
    def __init__(s, name, kind): s.name, s.kind, s.tris = name, kind, []
MODELS = {}
def model(name, kind='prop'):
    m = Model(name, kind); MODELS[name] = m; return m

def part(m, bm, paint, anim=0, smooth=False, split=55.0, mods=None, paint_all=None):
    """Bake one part into model m. paint: (region, rgb) or f(centre, normal) -> (region, rgb);
    paint_all: f([(centre, normal, area)]) -> [(region, rgb)] for whole-part classification."""
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    ob = to_obj(bm)
    if mods: run_mods(ob, mods)
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bpy.data.objects.remove(ob)
    lay = bm.faces.layers.int.new('pidx')   # (adding a layer invalidates face refs, so do it first)
    bm.normal_update()
    polys = [f for f in bm.faces if f.calc_area() > 1e-10]
    info = [(f.calc_center_median().copy(), f.normal.copy(), f.calc_area()) for f in polys]
    if paint_all: cols = paint_all(info)
    elif callable(paint): cols = [paint(c, n) for c, n, a in info]
    else: cols = [paint] * len(polys)
    for f in bm.faces: f[lay] = -1
    for i, f in enumerate(polys): f[lay] = i
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.normal_update()
    cs = math.cos(math.radians(split))
    for f in bm.faces:
        if f[lay] < 0 or f.calc_area() < 1e-10: continue
        fn = f.normal.copy(); reg, col = cols[f[lay]]
        ps = [l.vert.co.copy() for l in f.loops]
        if smooth:
            ns = []
            for l in f.loops:
                acc = Vector()
                for g in l.vert.link_faces:
                    if g.normal.dot(fn) >= cs: acc += g.normal * g.calc_area()
                ns.append(acc.normalized() if acc.length > 1e-12 else fn.copy())
        else:
            ns = [fn.copy()] * 3
        m.tris.append((ps, ns, tuple(col), int(reg), int(anim)))
    bm.free()

def scale_model(m, k):
    m.tris = [([p * k for p in ps], ns, c, r, a) for ps, ns, c, r, a in m.tris]

def jit(rng, c, a=0.05): return shade(c, 1.0 + rng.uniform(-a, a))

# ------------------------------------------------------------------ trees
def trunk_part(m, pts, radii, sides=5, rng=None, col=None, phase=0.0):
    rng = rng or random.Random(1); col = col or C['bark']
    bm = bmesh.new(); tube(bm, pts, radii, sides=sides, caps=(False, True), phase=phase)
    def paint(c, n):
        k = 0.82 + 0.18 * min(1.0, c.z / 1.2)
        return (0, jit(rng, shade(col, k), 0.06))
    part(m, bm, paint)

def branch(m, a, b, r0, r1, rng, col=None, sides=3, mid=None):
    bm = bmesh.new()
    pts = [a, mid, b] if mid else [a, b]
    rr = [r0, (r0 + r1) / 2, r1] if mid else [r0, r1]
    tube(bm, pts, rr, sides=sides, caps=(False, False))
    part(m, bm, lambda c, n: (0, jit(rng, col or C['bark'], 0.05)))

def crown_painter(main, sec, mode, seed, frac=0.3):
    """mode 'shade': region 2 = darker undersides / inner tufts; 'bloom': region 2 = blossom clusters (~frac of area)."""
    rng = random.Random(seed); off = Vector((seed * 3.1, seed * 1.7, seed * 2.3))
    def f(info):
        zs = [c.z for c, n, a in info]; z0, z1 = min(zs), max(zs)
        xy = [math.hypot(c.x, c.y) for c, n, a in info]; rmax = max(xy) or 1
        score = []
        for (c, n, a), d in zip(info, xy):
            if mode == 'shade':
                s = -n.z * 0.9 + (1 - d / rmax) * 0.35 + noise.noise(c * 1.6 + off) * 0.55
            else:
                s = noise.noise(c * 2.4 + off) + 0.45 * n.z + 0.15 * (c.z - z0) / max(1e-3, z1 - z0)
            score.append(s)
        order = sorted(range(len(info)), key=lambda i: -score[i])
        tot = sum(a for c, n, a in info); acc = 0; sec_set = set()
        for i in order:
            if acc >= tot * frac: break
            sec_set.add(i); acc += info[i][2]
        out = []
        for i, (c, n, a) in enumerate(info):
            t = (c.z - z0) / max(1e-3, z1 - z0)
            if i in sec_set:
                k = (0.9 + 0.12 * t) if mode == 'shade' else (0.94 + 0.08 * t)
                out.append((2, jit(rng, shade(sec, k), 0.04)))
            else:
                k = 0.84 + 0.22 * t + 0.08 * max(0.0, n.z)
                out.append((1, jit(rng, shade(main, k), 0.05)))
        return out
    return f

def foliage(m, blobs, voxel, target, disp, seed, painter, flat=0.45):
    """blobs: [(centre, (rx, ry, rz), rotz)]; merged with voxel Remesh, displaced with a noise texture, decimated."""
    bm = bmesh.new()
    for c, r, rz in blobs:
        g = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        R = Matrix.Rotation(rz, 3, 'Z')
        for v in g['verts']:
            x, y, z = v.co
            if z < -flat: z = -flat + (z + flat) * 0.3      # flatter undersides, like needle / leaf tufts
            v.co = R @ Vector((x * r[0], y * r[1], z * r[2])) + Vector(c)
    tex = noise_tex(disp[0]); emp = offset_empty(seed)
    part(m, bm, None, paint_all=painter, mods=[
        ('REMESH', dict(mode='VOXEL', voxel_size=voxel)),
        ('DISPLACE', dict(texture=tex, strength=disp[1], mid_level=0.5, texture_coords='OBJECT', texture_coords_object=emp)),
        ('DECIMATE', dict(target=target)),
    ])

def pine_mature(name, Ht, seed, n_tufts=8, lean=(0.0, 0.0), target=128):
    rng = random.Random(seed); m = model(name, 'tree')
    lx, ly = lean
    def trunk_at(z):
        t = z / Ht; return Vector((lx * t * t, ly * t * t, z))
    zs = [0, 0.3, Ht * 0.5, Ht - 0.35]
    trunk_part(m, [trunk_at(z) + Vector((rng.uniform(-0.02, 0.02), rng.uniform(-0.02, 0.02), 0)) * (z > 0.5) for z in zs] + [trunk_at(Ht - 0.15)],
               [0.13, 0.1, 0.075, 0.035, 0.0], sides=5, rng=rng, phase=rng.uniform(0, 1))
    base = Ht * 0.58; top = Ht - 0.2
    blobs = []
    a0 = rng.uniform(0, 6.28)
    for i in range(n_tufts):
        t = i / (n_tufts - 1)
        z = base + 0.2 + t * (top - base - 0.45) + rng.uniform(-0.08, 0.08)
        d = 0.06 + 0.4 * math.sin(math.pi * (0.35 + 0.65 * t)) * rng.uniform(0.8, 1.15)
        a = a0 + i * 2.39996 + rng.uniform(-0.35, 0.35)
        c = trunk_at(z) + Vector((math.cos(a) * d, math.sin(a) * d, 0))
        s = rng.uniform(0.9, 1.1) * (1.0 - 0.3 * t)
        blobs.append((c, (0.47 * s, 0.41 * s, 0.29 * s), a))
        if d > 0.26 and i < n_tufts - 3 and i % 2 == 0:
            b0 = trunk_at(z - 0.22)
            branch(m, b0, c - Vector((0, 0, 0.06)), 0.03, 0.018, rng)
    blobs.append((trunk_at(top) + Vector((0, 0, 0.05)), (0.26, 0.24, 0.24), 0))
    # a dead branch stub low on the self-pruned trunk
    zst = Ht * rng.uniform(0.38, 0.5); ast = rng.uniform(0, 6.28)
    branch(m, trunk_at(zst), trunk_at(zst) + Vector((math.cos(ast) * 0.22, math.sin(ast) * 0.22, 0.08)), 0.022, 0.006, rng)
    foliage(m, blobs, 0.05, target, (0.4, 0.16), seed, crown_painter(C['needle'], C['needle_dk'], 'shade', seed, 0.34))
    return m

def pine_young(name, Ht, seed, target=142):
    rng = random.Random(seed); m = model(name, 'tree')
    trunk_part(m, [(0, 0, 0), (0, 0, 0.25), (0.01, 0, Ht * 0.55), (0, 0, Ht - 0.05)], [0.1, 0.08, 0.05, 0.0], sides=5, rng=rng)
    blobs = []; base = 0.75; a0 = rng.uniform(0, 6.28)
    whorls = 6
    for w in range(whorls):
        t = w / (whorls - 1)
        z = base + t * (Ht - base - 0.7)
        d = 0.5 * (1 - t) ** 0.9 + 0.08
        k = 3 if w < whorls - 1 else 2
        for j in range(k):
            a = a0 + w * 1.1 + j * 2 * math.pi / k + rng.uniform(-0.3, 0.3)
            s = (1.0 - 0.5 * t) * rng.uniform(0.85, 1.1)
            c = Vector((math.cos(a) * d * rng.uniform(0.85, 1.1), math.sin(a) * d, z + rng.uniform(-0.06, 0.06)))
            blobs.append((c, (0.48 * s, 0.42 * s, 0.37 * s), a))
            if w < 1: branch(m, Vector((0, 0, z - 0.12)), c - Vector((0, 0, 0.08)), 0.025, 0.014, rng)
    blobs.append((Vector((0, 0, Ht - 0.32)), (0.27, 0.25, 0.22), 0.4))
    foliage(m, blobs, 0.05, target, (0.4, 0.16), seed, crown_painter(C['needle'], C['needle_dk'], 'shade', seed, 0.34))
    return m

def oak(name, Ht, seed, spread=1.0, target=134):
    rng = random.Random(seed); m = model(name, 'tree')
    fork = Vector((0.03, 0.0, 1.25))
    trunk_part(m, [(0, 0, 0), (0, 0, 0.22), (0.02, 0.0, 0.8), fork], [0.17, 0.125, 0.11, 0.1], sides=6, rng=rng, col=C['hard_bark'])
    cz = Ht - 1.0
    blobs = [(Vector((0, 0, cz + 0.05)), (0.85 * spread, 0.8 * spread, 0.78), 0)]
    a0 = rng.uniform(0, 6.28); n = 5
    for i in range(n):
        a = a0 + i * 2 * math.pi / n + rng.uniform(-0.3, 0.3)
        d = 0.7 * spread * rng.uniform(0.85, 1.15)
        z = cz - 0.12 + rng.uniform(-0.2, 0.22)
        s = rng.uniform(0.85, 1.05)
        c = Vector((math.cos(a) * d, math.sin(a) * d, z))
        blobs.append((c, (0.62 * s, 0.58 * s, 0.52 * s), a))
        if i < 2:  # limbs from the fork out to the lower blobs
            tip = Vector((math.cos(a) * d * 0.8, math.sin(a) * d * 0.8, z - 0.25))
            mid = fork.lerp(tip, 0.5) + Vector((0, 0, 0.12))
            branch(m, fork - Vector((0, 0, 0.12)), tip, 0.08, 0.035, rng, col=C['hard_bark'], sides=4, mid=mid)
    blobs.append((Vector((rng.uniform(-0.2, 0.2), rng.uniform(-0.2, 0.2), cz + 0.6)), (0.55, 0.52, 0.42), 0))
    foliage(m, blobs, 0.07, target, (0.55, 0.24), seed, crown_painter(C['oak'], C['oak_dk'], 'shade', seed, 0.32), flat=0.5)
    return m

def redbud(name, Ht, seed, target=130):
    rng = random.Random(seed); m = model(name, 'tree')
    a0 = rng.uniform(0, 6.28); blobs = []
    for i in range(3):
        a = a0 + i * 2.1 + rng.uniform(-0.3, 0.3); d = rng.uniform(0.3, 0.42)
        tip = Vector((math.cos(a) * d, math.sin(a) * d, Ht * 0.6))
        mid = Vector((math.cos(a) * d * 0.35, math.sin(a) * d * 0.35, Ht * 0.3))
        bm = bmesh.new(); tube(bm, [(0, 0, 0), mid, tip], [0.05, 0.034, 0.02], sides=4, caps=(False, True))
        part(m, bm, lambda c, n: (0, jit(rng, shade(C['hard_bark'], 0.85), 0.05)))
    zc = Ht - 0.5
    blobs.append((Vector((0, 0, zc + 0.1)), (0.5, 0.48, 0.36), 0))
    for i in range(5):
        a = a0 + 0.5 + i * 2 * math.pi / 5 + rng.uniform(-0.3, 0.3); d = rng.uniform(0.45, 0.58)
        blobs.append((Vector((math.cos(a) * d, math.sin(a) * d, zc - 0.05 + rng.uniform(-0.08, 0.08))), (0.42, 0.38, 0.32), a))
    for i in range(2):
        a = a0 + 2.0 + i * 3.1
        blobs.append((Vector((math.cos(a) * 0.3, math.sin(a) * 0.3, zc + 0.25)), (0.36, 0.33, 0.24), a))
    foliage(m, blobs, 0.045, target, (0.3, 0.14), seed, crown_painter(C['redbud_leaf'], C['redbud'], 'bloom', seed, 0.3), flat=0.35)
    return m

def dogwood(name, Ht, seed, target=134):
    rng = random.Random(seed); m = model(name, 'tree')
    top = Vector((0.04, 0.02, Ht - 0.35))
    trunk_part(m, [(0, 0, 0), (0, 0, 0.15), (0.03, 0.0, 0.7), top], [0.075, 0.06, 0.045, 0.02], sides=5, rng=rng, col=C['hard_bark'])
    tiers = [(0.95, 0.6, 5, 0.42), (Ht * 0.6 + 0.05, 0.45, 4, 0.36), (Ht - 0.35, 0.22, 3, 0.27)]
    blobs = []; a0 = rng.uniform(0, 6.28)
    for ti, (z, d, k, s) in enumerate(tiers):
        for j in range(k):
            a = a0 + ti * 0.9 + j * 2 * math.pi / k + rng.uniform(-0.25, 0.25)
            dd = d * rng.uniform(0.8, 1.1)
            c = Vector((math.cos(a) * dd, math.sin(a) * dd, z + rng.uniform(-0.04, 0.04)))
            blobs.append((c, (s * 1.15, s * 0.9, 0.12 + 0.02 * ti), a))
            if ti == 0 or (ti == 1 and j % 2 == 0): branch(m, Vector((0.02, 0, z - 0.12)), c - Vector((0, 0, 0.04)), 0.022, 0.012, rng, col=C['hard_bark'])
    blobs.append((top + Vector((0, 0, 0.2)), (0.14, 0.13, 0.1), 0))
    foliage(m, blobs, 0.035, target, (0.3, 0.08), seed, crown_painter(C['dogwood_leaf'], C['dogwood'], 'bloom', seed, 0.3), flat=0.3)
    return m

# ------------------------------------------------------------------ people
PERSON = dict(hip=(0.037, 0.275), shoulder=(0.083, 0.44))

def person(name, sit=False):
    m = model(name, 'char')
    dz = -0.24 if sit else 0.0          # seated: origin at the bottom of the buttocks
    def Z(p): return Vector((p[0], p[1], p[2] + dz))
    # torso: pants band below the waist, shirt above (the head hides the neck ring)
    bm = bmesh.new()
    rings = [(0.24, 0.053, 0.036), (0.3, 0.061, 0.039), (0.435, 0.075, 0.044), (0.48, 0.026, 0.024)]
    tube(bm, [Z((0, 0.002, z)) for z, rx, ry in rings], [(rx, ry) for z, rx, ry in rings], sides=8, caps=(True, False), phase=math.pi / 8)
    part(m, bm, lambda c, n: (2, C['pants']) if c.z - dz < 0.295 else (1, C['shirt']), anim=0, smooth=True, split=100)
    # head, a little large for readability; hair on the crown and the back of the head
    hc = Z((0, -0.004, 0.548)); hr = (0.06, 0.063, 0.07)
    bm = bmesh.new(); ellipsoid(bm, hc, hr, seg=8, rings=4, phase=math.pi / 8)
    def head_paint(c, n):
        lz = (c.z - hc.z) / hr[2]; ly = (c.y - hc.y) / hr[1]
        hair = lz > 0.6 or (lz > 0.2 and ly > -0.5) or (ly > 0.4 and lz > -0.6)   # cap, sides (forehead stays skin), nape
        return (4, C['hair']) if hair else (0, C['skin'])
    part(m, bm, head_paint, anim=0, smooth=True, split=100)
    for s in (1, -1):  # s = +1 is the character's left (+X when facing -Y)
        x = PERSON['hip'][0] * s
        la = 0 if sit else (1 if s > 0 else 2); aa = 0 if sit else (3 if s > 0 else 4)
        if sit:
            leg = [(x, 0.004, 0.028 - dz), (x * 1.05, -0.13, 0.028 - dz), (x * 1.05, -0.135, -0.093 - dz)]
            shoe_c = (x * 1.05, -0.148, -0.112 - dz)
        else:
            leg = [(x, 0.0, 0.285), (x * 0.98, -0.004, 0.15), (x * 0.96, 0.0, 0.036)]
            shoe_c = (x * 0.96, -0.012, 0.018)
        bm = bmesh.new(); tube(bm, [Z(p) for p in leg], [0.03, 0.023, 0.019], sides=5, caps=(False, False), phase=math.pi / 2)
        part(m, bm, (2, C['pants']), anim=la, smooth=True, split=100)
        bm = bmesh.new(); box(bm, Z(shoe_c), (0.046, 0.08, 0.036), skip=('top',), taper=(0.92, 0.85))
        part(m, bm, (3, C['shoes']), anim=la)
        if sit:
            arm = [(0.083 * s, 0.0, 0.445), (0.097 * s, -0.03, 0.35), (0.075 * s, -0.098, 0.318)]
            hand = (0.07 * s, -0.112, 0.3)
        else:
            arm = [(0.083 * s, 0.0, 0.445), (0.095 * s, 0.004, 0.348), (0.101 * s, -0.006, 0.265)]
            hand = (0.103 * s, -0.008, 0.25)
        up_len = (Vector(arm[1]) - Vector(arm[0])).length; sh = Z(arm[0])
        bm = bmesh.new(); tube(bm, [Z(p) for p in arm], [0.021, 0.018, 0.016], sides=4, caps=(True, False), phase=math.pi / 4)
        part(m, bm, lambda c, n, sh=sh, ul=up_len: (1, C['shirt']) if (c - sh).length < ul * 0.85 else (0, C['skin']), anim=aa, smooth=True, split=100)
        bm = bmesh.new()  # chunky mitten hands
        box(bm, Z(hand), (0.03, 0.036, 0.042), skip=('top',), taper=(0.85, 0.85))
        part(m, bm, (0, C['skin']), anim=aa)
    return m

BEAR = dict(hip=(0.064, 0.21), shoulder=(0.112, 0.47))

def bear():
    m = model('bear', 'char')
    # torso: fur, tan belly on the front, red vest open at the front
    bm = bmesh.new()
    rings = [(0.16, 0.092, 0.082), (0.27, 0.128, 0.114), (0.39, 0.12, 0.106), (0.47, 0.096, 0.082), (0.52, 0.05, 0.045)]
    tube(bm, [(0, 0.004, z) for z, rx, ry in rings], [(rx, ry) for z, rx, ry in rings], sides=8, caps=(True, True), phase=math.pi / 8)
    def torso_paint(c, n):
        front = n.y < -0.75 and abs(c.x) < 0.06
        if front and 0.19 < c.z < 0.44: return (1, C['muzzle'])
        if c.z > 0.31: return (2, C['vest'])
        return (0, C['fur'])
    part(m, bm, torso_paint, smooth=True, split=100)
    hc = Vector((0, -0.012, 0.61)); hr = (0.106, 0.096, 0.092)
    bm = bmesh.new(); ellipsoid(bm, hc, hr, seg=8, rings=4, phase=math.pi / 8)
    part(m, bm, (0, C['fur']), smooth=True, split=100)
    bm = bmesh.new(); ellipsoid(bm, (0, -0.09, 0.578), (0.054, 0.042, 0.038), seg=6, rings=3, phase=math.pi / 6)
    part(m, bm, (1, C['muzzle']), smooth=True, split=100)
    bm = bmesh.new(); octa(bm, (0, -0.131, 0.592), (0.02, 0.012, 0.013))
    part(m, bm, (0, C['eye']))
    for s in (1, -1):
        bm = bmesh.new(); octa(bm, (0.042 * s, -0.096, 0.64), (0.012, 0.005, 0.014))
        part(m, bm, (0, C['eye']))
        bm = bmesh.new(); ellipsoid(bm, (0.074 * s, 0.0, 0.69), (0.04, 0.022, 0.038), seg=5, rings=3, rot=Matrix.Rotation(-0.4 * s, 3, 'Y'), phase=-math.pi / 2)
        part(m, bm, lambda c, n: (1, shade(C['muzzle'], 0.85)) if n.y < -0.7 else (0, C['fur']), smooth=True, split=100)
        x = BEAR['hip'][0] * s; la = 1 if s > 0 else 2; aa = 3 if s > 0 else 4
        bm = bmesh.new(); tube(bm, [(x, 0.0, 0.22), (x * 1.02, -0.006, 0.13), (x * 1.04, 0.0, 0.045)], [0.056, 0.05, 0.045], sides=6, caps=(False, False))
        part(m, bm, (0, C['fur']), anim=la, smooth=True, split=100)
        bm = bmesh.new(); ellipsoid(bm, (x * 1.04, -0.024, 0.03), (0.052, 0.072, 0.034), seg=5, rings=3, zclip=-0.03, phase=-math.pi / 2)
        part(m, bm, (0, shade(C['fur'], 0.85)), anim=la, smooth=True, split=100)
        sx = BEAR['shoulder'][0] * s
        bm = bmesh.new(); tube(bm, [(sx, 0.0, 0.475), (sx * 1.2, -0.006, 0.385), (sx * 1.3, -0.02, 0.3)], [0.043, 0.039, 0.036], sides=5, caps=(True, False), phase=math.pi / 2)
        part(m, bm, (0, C['fur']), anim=aa, smooth=True, split=100)
        bm = bmesh.new(); ellipsoid(bm, (sx * 1.32, -0.024, 0.28), (0.04, 0.038, 0.042), seg=5, rings=3)
        part(m, bm, (0, C['fur']), anim=aa, smooth=True, split=100)
    return m

def bear_statue():
    m = model('bear_statue')
    rng = random.Random(11)
    # plinth: a sawn log round with bark sides and a lighter cut top (with one growth ring)
    bm = bmesh.new()
    sides = 11; pts = []
    for zz, r in ((0.0, 0.215), (0.13, 0.2), (0.15, 0.2)):
        pts.append([((r + 0.012 * math.sin(k * 2.7)) * math.cos(2 * math.pi * k / sides), (r + 0.012 * math.sin(k * 2.7)) * math.sin(2 * math.pi * k / sides), zz) for k in range(sides)])
    ring_loft(bm, pts, caps=(False, True))
    topf = [f for f in bm.faces if len(f.verts) == sides]
    bmesh.ops.inset_region(bm, faces=topf, thickness=0.06)
    def plinth_paint(c, n):
        if n.z > 0.9:
            return (1, C['plinth_cut'] if math.hypot(c.x, c.y) > 0.13 else shade(C['plinth_cut'], 0.86))
        return (1, jit(rng, C['plinth'], 0.07))
    part(m, bm, plinth_paint)
    # the carved bear, sitting up on its haunches: blobs merged with Remesh, chisel-faceted by Displace + Decimate
    z0 = 0.15
    bm = bmesh.new()
    def E(c, r, rot=None):
        g = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
        M = rot or Matrix.Identity(3)
        for v in g['verts']: v.co = M @ Vector((v.co.x * r[0], v.co.y * r[1], v.co.z * r[2])) + Vector((c[0], c[1], c[2] + z0))
    E((0, 0.04, 0.11), (0.14, 0.13, 0.115))                                  # rump / haunches
    E((0, 0.005, 0.24), (0.125, 0.105, 0.15), Matrix.Rotation(0.2, 3, 'X'))   # belly and chest
    E((0, -0.02, 0.35), (0.085, 0.075, 0.06))                                # shoulder hump
    E((0, -0.05, 0.43), (0.082, 0.082, 0.072))                               # head
    E((0, -0.13, 0.415), (0.04, 0.06, 0.034), Matrix.Rotation(0.15, 3, 'X')) # long snout
    for s in (1, -1):
        E((0.095 * s, -0.035, 0.08), (0.06, 0.11, 0.07))                     # hind thighs
        E((0.1 * s, -0.15, 0.035), (0.048, 0.055, 0.035))                    # hind feet
        tube(bm, [(0.06 * s, -0.06, z0 + 0.3), (0.058 * s, -0.11, z0 + 0.16), (0.054 * s, -0.12, z0 + 0.04)], [0.04, 0.036, 0.034], sides=8, caps=(True, True))
    emp = offset_empty(77)
    def bear_paint(c, n):
        lt = (c.y < -0.12 and c.z > z0 + 0.38) or (n.y < -0.5 and z0 + 0.13 < c.z < z0 + 0.3 and abs(c.x) < 0.045)
        return (0, jit(rng, C['carved_lt'] if lt else C['carved'], 0.08))
    part(m, bm, bear_paint, mods=[
        ('REMESH', dict(mode='VOXEL', voxel_size=0.01)),
        ('DISPLACE', dict(texture=noise_tex(0.05, 'VORONOI'), strength=0.008, mid_level=0.5, texture_coords='OBJECT', texture_coords_object=emp)),
        ('DECIMATE', dict(target=170)),
    ])
    for s in (1, -1):  # small round ears, kept out of the decimation so they stay rounded
        bm = bmesh.new(); ellipsoid(bm, (0.058 * s, -0.035, z0 + 0.495), (0.03, 0.017, 0.027), seg=6, rings=3, rot=Matrix.Rotation(-0.3 * s, 3, 'Y'))
        part(m, bm, lambda c, n: (0, C['carved_lt'] if n.y < -0.7 else C['carved']))
    return m

# ------------------------------------------------------------------ rides
def horse():
    m = model('horse')
    def body_paint(c, n): return (0, C['horse'])
    bm = bmesh.new()
    tube(bm, [(0, -0.155, 0.245), (0, -0.125, 0.242), (0, -0.04, 0.232), (0, 0.05, 0.236), (0, 0.125, 0.246), (0, 0.163, 0.256)],
         [(0.034, 0.042), (0.05, 0.062), (0.055, 0.064), (0.056, 0.066), (0.05, 0.06), (0.022, 0.026)], sides=8, caps=(True, True), phase=math.pi / 8)
    tube(bm, [(0, -0.115, 0.255), (0, -0.165, 0.325), (0, -0.19, 0.385)], [(0.036, 0.05), (0.028, 0.035), (0.025, 0.028)], sides=6, caps=(False, False))
    part(m, bm, body_paint, smooth=True)
    bm = bmesh.new()
    tube(bm, [(0, -0.178, 0.402), (0, -0.232, 0.373), (0, -0.276, 0.343)], [(0.026, 0.03), (0.022, 0.025), (0.017, 0.017)], sides=6, caps=(True, True))
    hp = [Vector((0, -0.178, 0.402)), Vector((0, -0.276, 0.343))]
    part(m, bm, lambda c, n: (2, C['gold']) if abs((c - hp[0]).length - 0.065) < 0.012 else (0, C['horse']), smooth=True)
    for s in (1, -1):
        bm = bmesh.new(); tube(bm, [(0.013 * s, -0.172, 0.415), (0.016 * s, -0.166, 0.447)], [0.009, 0.0], sides=4, caps=(True, False))
        part(m, bm, (0, C['horse']))
        bm = bmesh.new(); octa(bm, (0.022 * s, -0.213, 0.39), (0.004, 0.008, 0.006))
        part(m, bm, (0, C['eye']))
    legs = [
        [(0.03, -0.108, 0.218), (0.034, -0.176, 0.182), (0.034, -0.142, 0.135), (0.034, -0.147, 0.113)],
        [(-0.03, -0.108, 0.218), (-0.034, -0.186, 0.2), (-0.034, -0.196, 0.148), (-0.034, -0.208, 0.13)],
        [(0.034, 0.108, 0.212), (0.037, 0.098, 0.15), (0.038, 0.178, 0.1), (0.038, 0.205, 0.032)],
        [(-0.034, 0.108, 0.212), (-0.037, 0.075, 0.14), (-0.038, 0.143, 0.082), (-0.038, 0.16, 0.015)],
    ]
    for L in legs:
        bm = bmesh.new()
        tube(bm, L, [0.026, 0.016, 0.012, 0.013], sides=5, caps=(False, True), phase=math.pi / 2)
        tip = Vector(L[-1]); hoof_d = (Vector(L[-1]) - Vector(L[-2])).length
        part(m, bm, lambda c, n, tip=tip, hd=hoof_d: (2, C['gold']) if (c - tip).length < hd * 1.05 else (0, C['horse']), smooth=True)
    bm = bmesh.new()  # mane along the crest, with a forelock
    tube(bm, [(0, -0.112, 0.298), (0, -0.142, 0.34), (0, -0.168, 0.392), (0, -0.182, 0.425), (0, -0.196, 0.418)],
         [(0.012, 0.016), (0.014, 0.026), (0.013, 0.024), (0.011, 0.016), (0.004, 0.006)], sides=4, caps=(True, True))
    part(m, bm, (1, C['mane']), smooth=True)
    bm = bmesh.new()
    tube(bm, [(0, 0.158, 0.262), (0, 0.198, 0.27), (0, 0.232, 0.232), (0, 0.246, 0.17), (0, 0.25, 0.135)],
         [(0.016, 0.02), (0.022, 0.026), (0.02, 0.022), (0.013, 0.014), (0.0, 0.0)], sides=5, caps=(True, False))
    part(m, bm, (1, C['mane']), smooth=True)
    bm = bmesh.new()  # saddle seat + cantle, a blanket band round the barrel, breast collar (gold trim)
    ellipsoid(bm, (0, 0.002, 0.303), (0.034, 0.046, 0.01), seg=8, rings=3)
    ellipsoid(bm, (0, 0.006, 0.27), (0.066, 0.056, 0.035), seg=8, rings=3, phase=math.pi / 8)
    tube(bm, [(0, -0.112, 0.243), (0, -0.098, 0.242)], [(0.054, 0.066), (0.057, 0.068)], sides=8, caps=(False, False), phase=math.pi / 8)
    part(m, bm, lambda c, n: (2, C['gold'] if c.z > 0.28 else shade(C['gold'], 0.85)), smooth=True)
    scale_model(m, 0.92)
    return m

def teacup():
    m = model('teacup')
    bm = bmesh.new()
    prof = [(0, 0), (0.17, 0), (0.2, 0.05), (0.27, 0.1), (0.33, 0.19), (0.352, 0.29), (0.35, 0.365),
            (0.334, 0.385), (0.318, 0.335), (0.292, 0.215), (0.205, 0.135), (0, 0.128)]
    lathe(bm, prof, 12)
    def paint(c, n):
        rad = Vector((c.x, c.y, 0)); out = rad.normalized().dot(Vector((n.x, n.y, 0))) if rad.length > 1e-4 else -1
        if c.z < 0.055: return (1, C['cup_trim'])
        if c.z > 0.36: return (1, C['cup_trim'])
        if out > 0.05 and rad.length > 0.2: return (0, C['cup'])
        return (2, C['cup_in'])
    part(m, bm, paint, smooth=True, split=40)
    bm = bmesh.new()  # handle
    tube(bm, [(0.338, 0, 0.31), (0.395, 0, 0.3), (0.415, 0, 0.235), (0.375, 0, 0.165), (0.315, 0, 0.165)], [(0.018, 0.024)] * 5, sides=4, caps=(False, False), ref=(0, 1, 0))
    part(m, bm, (1, C['cup_trim']), smooth=True)
    bm = bmesh.new()  # centre wheel on its post
    tube(bm, [(0, 0, 0.128), (0, 0, 0.27)], [0.02, 0.016], sides=6, caps=(False, False))
    tube(bm, [(0, 0, 0.265), (0, 0, 0.292)], [0.095, 0.095], sides=10, caps=(True, True))
    part(m, bm, lambda c, n: (2, C['wheel'] if c.z > 0.26 else shade(C['metal'], 0.9)), smooth=True, split=40)
    return m

def log_boat():
    m = model('log_boat')
    rng = random.Random(21)
    R = 0.175; zc = R
    bm = bmesh.new()
    st = [(-0.45, 0.122), (-0.415, 0.158), (-0.33, 0.175), (0.3, 0.175), (0.415, 0.17), (0.45, 0.16)]
    tube(bm, [(0, y, zc) for y, r in st], [(r, r * 0.95) for y, r in st], sides=10, caps=(True, True), phase=0.31)
    ob_cut1 = bmesh.new(); ellipsoid(ob_cut1, (0, 0.015, 0.235), (0.13, 0.345, 0.16), seg=10, rings=6)
    c1 = to_obj(ob_cut1, 'cut1')
    ob_cut2 = bmesh.new(); box(ob_cut2, (0, 0, 0.29 + 0.25), (1.2, 1.2, 0.5)); c2 = to_obj(ob_cut2, 'cut2')
    def paint(c, n):
        rad = Vector((c.x, 0, c.z - zc))
        rdot = rad.normalized().dot(Vector((n.x, 0, n.z))) if rad.length > 1e-4 else 0
        if abs(n.y) > 0.88 and abs(c.y) > 0.4: return (2, C['log_end'] if rad.length > 0.06 else shade(C['log_end'], 0.85))
        if n.z > 0.95 and c.z > 0.28: return (1, shade(C['log_in'], 1.08))
        if rdot > 0.2 and rad.length > 0.11: return (0, jit(rng, C['log'], 0.09))
        return (1, C['log_in'])
    part(m, bm, paint, mods=[('BOOLEAN', dict(operation='DIFFERENCE', object=c1, solver='EXACT')),
                             ('BOOLEAN', dict(operation='DIFFERENCE', object=c2, solver='EXACT'))])
    bpy.data.objects.remove(c1); bpy.data.objects.remove(c2)
    bm = bmesh.new()
    for y in (-0.17, 0.03, 0.22):
        box(bm, (0, y, 0.175), (0.26, 0.065, 0.026), skip=('bottom',))
    part(m, bm, (1, C['bench']))
    bm = bmesh.new()  # a couple of branch stubs on the flanks
    tube(bm, [(0.15, 0.17, 0.215), (0.205, 0.19, 0.25)], [0.026, 0.012], sides=4, caps=(False, True))
    tube(bm, [(-0.155, -0.24, 0.19), (-0.2, -0.255, 0.2)], [0.02, 0.01], sides=4, caps=(False, True))
    part(m, bm, lambda c, n: (0, shade(C['log'], 0.9)))
    return m

def coaster_car(name, lead=False):
    m = model(name)
    bm = bmesh.new()
    def RR(w, l, z, rc=0.06, npc=2): return [(x, y, z) for x, y in rrect(w, l, rc, npc)]
    rings = [RR(0.172, 0.282, 0.062), RR(0.19, 0.3, 0.1), RR(0.19, 0.3, 0.172), RR(0.166, 0.276, 0.172, 0.045), RR(0.166, 0.276, 0.095, 0.045)]
    ring_loft(bm, rings, caps=(True, True))
    def tub_paint(c, n):
        inner = abs(c.x) < 0.168 and abs(c.y) < 0.278 and c.z < 0.17
        if inner: return (1, shade(C['seat'], 1.15))
        return (0, C['car'] if c.z > 0.075 else shade(C['car'], 0.8))
    part(m, bm, tub_paint, smooth=True, split=40)
    bm = bmesh.new()
    for yr in (-0.11, 0.135):  # two rows of two riders
        for sx in (-0.078, 0.078):
            box(bm, (sx, yr + 0.02, 0.117), (0.14, 0.115, 0.045), skip=('bottom',))
        box(bm, (0, yr + 0.09, 0.185), (0.32, 0.035, 0.14), rot=Matrix.Rotation(-0.18, 3, 'X'), skip=('bottom',))
    part(m, bm, lambda c, n: (1, C['seat'] if n.z < 0.8 else shade(C['seat'], 1.25)))
    bm = bmesh.new()
    for yr in (-0.11, 0.135):  # T lap bars
        tube(bm, [(-0.13, yr - 0.06, 0.19), (0.13, yr - 0.06, 0.19)], 0.011, sides=4, caps=(True, True))
        tube(bm, [(0, yr - 0.06, 0.1), (0, yr - 0.06, 0.19)], 0.011, sides=4, caps=(False, False))
    for yw in (-0.2, 0.2):  # bogies and wheels
        box(bm, (0, yw, 0.052), (0.3, 0.07, 0.028), skip=('top',))
        for sx in (-0.168, 0.168):
            tube(bm, [(sx - 0.016, yw, 0.035), (sx + 0.016, yw, 0.035)], 0.035, sides=5, caps=(True, True), phase=math.pi / 2)
    box(bm, (0, 0.31, 0.06), (0.05, 0.045, 0.026))
    part(m, bm, lambda c, n: (2, C['metal'] if c.z > 0.08 else C['metal_dk']), smooth=False)
    if lead:
        bm = bmesh.new()
        nose = [(-0.28, (0.19, 0.075), 0.12), (-0.35, (0.178, 0.068), 0.118), (-0.405, (0.13, 0.05), 0.112), (-0.432, (0.0, 0.0), 0.108)]
        tube(bm, [(0, y, z) for y, r, z in nose], [r for y, r, z in nose], sides=10, caps=(False, False), phase=math.pi / 10)
        part(m, bm, lambda c, n: (0, C['car'] if c.z > 0.08 else shade(C['car'], 0.8)), smooth=True, split=50)
        bm = bmesh.new(); octa(bm, (0, -0.428, 0.128), (0.03, 0.012, 0.022))
        part(m, bm, (2, H('#F4E7B0')))
        bm = bmesh.new()  # low windscreen cowl in front of the first row
        box(bm, (0, -0.22, 0.2), (0.3, 0.018, 0.06), rot=Matrix.Rotation(0.5, 3, 'X'), skip=('bottom',))
        part(m, bm, (2, H('#BFD4DC')))
    return m

def inner_tube():
    m = model('tube')
    bm = bmesh.new()
    Rm, rm, seg, sides = 0.17, 0.055, 12, 5
    pts = [(Rm * math.cos(2 * math.pi * k / seg), Rm * math.sin(2 * math.pi * k / seg), rm) for k in range(seg)]
    rings = []
    for k in range(seg):
        a = 2 * math.pi * k / seg; out = Vector((math.cos(a), math.sin(a), 0))
        rings.append([bm.verts.new(Vector(pts[k]) + out * (rm * math.cos(b)) + Vector((0, 0, rm * math.sin(b))))
                      for b in [2 * math.pi * j / sides for j in range(sides)]])
    for k in range(seg):
        a, b = rings[k], rings[(k + 1) % seg]
        for j in range(sides): bm.faces.new((a[j], b[j], b[(j + 1) % sides], a[(j + 1) % sides]))
    floor = [bm.verts.new((0.125 * math.cos(2 * math.pi * k / seg), 0.125 * math.sin(2 * math.pi * k / seg), 0.022)) for k in range(seg)]
    bm.faces.new(floor)
    part(m, bm, lambda c, n: (0, C['tube'] if c.z > 0.03 else shade(C['tube'], 0.78)), smooth=True, split=60)
    bm = bmesh.new()
    for a in (math.radians(v) for v in (60, 120, 240, 300)):
        arc = [Vector(((Rm - 0.012) * math.cos(a + d), (Rm - 0.012) * math.sin(a + d), 2 * rm + 0.003 + 0.02 * (1 - abs(d) / 0.2))) for d in (-0.2, 0.0, 0.2)]
        tube(bm, arc, 0.009, sides=3, caps=(True, True))
    part(m, bm, (1, C['handle']), smooth=False)
    return m

# ------------------------------------------------------------------ scenery
def rock(name, size, seed, main, sec, cuts=7, target=90, extra=None, layered=False, sec_frac=0.16, flat_top=False):
    """Boulder: a noisy icosphere chopped by random fracture planes (bisect + fill), then decimated.
    size = (width x, depth y, height z); extra = [(centre, size, rotz)] for additional pieces."""
    m = model(name)
    rng = random.Random(seed); off = Vector((seed * 1.3, seed * 2.1, seed * 0.7))
    bm = bmesh.new()
    pieces = [((0, 0, 0), size, rng.uniform(0, 3))] + (extra or [])
    for pi, (c, sz, rz) in enumerate(pieces):
        sub = bmesh.new()
        bmesh.ops.create_icosphere(sub, subdivisions=1, radius=1.0)
        a = Vector((sz[0] / 2, sz[1] / 2, sz[2]))
        for v in sub.verts:
            p = v.co.copy(); p += p.normalized() * (noise.noise(p * 1.4 + off + Vector((pi, 0, 0))) * 0.16)
            v.co = Vector((p.x * a.x, p.y * a.y, p.z * a.z))
        cen = Vector((0, 0, a.z * 0.25))
        dirs = []
        for i in range(cuts):
            d = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-0.35, 1.0))).normalized()
            dirs.append((d, rng.uniform(0.5, 0.74)))
        if flat_top: dirs.append((Vector((rng.uniform(-0.12, 0.12), rng.uniform(-0.12, 0.12), 1)).normalized(), 0.62))
        for d, f in dirs:
            hsup = math.sqrt((d.x * a.x) ** 2 + (d.y * a.y) ** 2 + (d.z * a.z) ** 2)
            geom = sub.verts[:] + sub.edges[:] + sub.faces[:]
            res = bmesh.ops.bisect_plane(sub, geom=geom, plane_co=cen + d * (hsup * f), plane_no=d, clear_outer=True)
            edges = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
            if edges: bmesh.ops.holes_fill(sub, edges=edges)
        Mr = Matrix.Rotation(rz, 3, 'Z')
        for v in sub.verts: v.co = Mr @ v.co + Vector(c)
        me = bpy.data.meshes.new('tmp'); sub.to_mesh(me); sub.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    for v in bm.verts:  # sit on the ground, slightly sunk
        if v.co.z < 0.02: v.co.z = 0.02 + (v.co.z - 0.02) * 0.15
    for v in bm.verts: v.co.z -= 0.03
    def paint_all(info):
        out = []
        score = [noise.noise(c * 4.0 + off) * 0.7 + n.z if n.z > 0.4 else -9 for c, n, ar in info]
        tot = sum(ar for c, n, ar in info); acc = 0; moss = set()
        for i in sorted(range(len(info)), key=lambda i: -score[i]):
            if acc > tot * sec_frac or score[i] < -5: break
            moss.add(i); acc += info[i][2]
        for i, (c, n, ar) in enumerate(info):
            if layered:
                band = 0.5 + 0.5 * math.sin(c.z * 40 + noise.noise(c * 3 + off) * 1.2)
                base = mixc(shade(main, 0.86), shade(main, 1.1), band)
            else:
                base = main
            if i in moss: out.append((1, jit(rng, sec, 0.06)))
            else: out.append((0, jit(rng, base, 0.05)))
        return out
    part(m, bm, None, paint_all=paint_all, mods=[('DECIMATE', dict(target=target))])
    return m

def stump():
    m = model('stump'); rng = random.Random(31)
    bm = bmesh.new(); sides = 9; rings = []
    for z, r, flare in ((0.0, 0.2, 0.075), (0.07, 0.155, 0.02), (0.27, 0.135, 0.0)):
        ring = []
        for k in range(sides):
            a = 2 * math.pi * k / sides
            rr = r + (flare if k % 3 == 0 else flare * 0.2) + rng.uniform(-0.008, 0.008)
            zz = z + (0.035 * math.cos(a) if z > 0.2 else 0.0)
            ring.append((rr * math.cos(a), rr * math.sin(a), zz))
        rings.append(ring)
    ring_loft(bm, rings, caps=(False, True))
    topf = [f for f in bm.faces if len(f.verts) == sides]
    bmesh.ops.inset_region(bm, faces=topf, thickness=0.05)
    def paint(c, n):
        if n.z > 0.9: return (1, C['stump_cut'] if math.hypot(c.x, c.y) > 0.07 else shade(C['stump_cut'], 0.85))
        return (0, jit(rng, C['bark'], 0.08))
    part(m, bm, paint)
    return m

def log_pile():
    m = model('log_pile'); rng = random.Random(41)
    r = 0.085; logs = []
    for i in range(3): logs.append((-0.172 + i * 0.172, r))
    for i in range(2): logs.append((-0.086 + i * 0.172, r + 0.172 * math.sin(math.radians(60))))
    logs.append((0.0, r + 2 * 0.172 * math.sin(math.radians(60))))
    for y, z in logs:
        rr = r * rng.uniform(0.92, 1.02); L = 0.4 * rng.uniform(0.92, 1.03); dx = rng.uniform(-0.03, 0.03)
        bm = bmesh.new()
        tube(bm, [(-L + dx, y, z), (L + dx, y + rng.uniform(-0.01, 0.01), z)], rr, sides=6, caps=(True, True), phase=rng.uniform(0, 1))
        bc = jit(rng, C['bark'], 0.1); cc = jit(rng, C['cut'], 0.06)
        part(m, bm, lambda c, n, bc=bc, cc=cc: (1, cc) if abs(n.x) > 0.9 else (0, jit(rng, bc, 0.05)))
    return m

def ore_cart():
    m = model('ore_cart'); rng = random.Random(51)
    bm = bmesh.new()
    for x in (-0.1, 0.1): box(bm, (x, 0, 0.045), (0.024, 0.6, 0.03), skip=('bottom',))
    part(m, bm, (1, C['rail']))
    bm = bmesh.new()
    for y in (-0.22, 0.0, 0.22): box(bm, (0, y + rng.uniform(-0.01, 0.01), 0.015), (0.32, 0.06, 0.03), rot=Matrix.Rotation(rng.uniform(-0.05, 0.05), 3, 'Z'), skip=('bottom',))
    part(m, bm, lambda c, n: (1, jit(rng, C['tie'], 0.08)))
    bm = bmesh.new()
    for yw in (-0.13, 0.13):
        for x in (-0.1, 0.1):
            tube(bm, [(x - 0.014, yw, 0.11), (x + 0.014, yw, 0.11)], 0.05, sides=6, caps=(True, True))
    part(m, bm, lambda c, n: (1, shade(C['rail'], 0.75) if abs(n.x) < 0.9 else C['rail']))
    bm = bmesh.new()
    def RR(w, l, z): return [(x, y, z) for x, y in rrect(w, l, 0.025, 2)]
    ring_loft(bm, [RR(0.13, 0.19, 0.12), RR(0.17, 0.25, 0.33), RR(0.152, 0.232, 0.33), RR(0.118, 0.178, 0.15)], caps=(True, True))
    part(m, bm, lambda c, n: (0, C['iron'] if c.z > 0.14 else C['iron_dk']), smooth=False)
    bm = bmesh.new()  # iron bands around the bin
    ring_loft(bm, [RR(0.162, 0.242, 0.285), RR(0.166, 0.246, 0.31)], caps=(False, False))
    for v in bm.verts: v.co.x *= 1.04; v.co.y *= 1.03
    part(m, bm, (0, C['iron_dk']))
    bm = bmesh.new()
    lumps = [((-0.05, -0.08, 0.33), 0.075), ((0.06, -0.04, 0.34), 0.08), ((-0.02, 0.06, 0.345), 0.085), ((0.07, 0.11, 0.325), 0.065), ((-0.08, 0.14, 0.32), 0.06)]
    for c, s in lumps:
        g = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=s)
        for v in g['verts']:
            v.co = Vector((v.co.x * rng.uniform(0.8, 1.2), v.co.y * rng.uniform(0.8, 1.2), v.co.z * 0.75)) + Vector(c)
    part(m, bm, lambda c, n: (2, jit(rng, C['ore'], 0.12)), mods=[('DECIMATE', dict(target=56))])
    bm = bmesh.new()  # quartz crystal points (Mount Ida quartz)
    octa(bm, (0.0, -0.01, 0.4), (0.02, 0.02, 0.06), rot=Matrix.Rotation(0.3, 3, 'X'))
    octa(bm, (0.04, 0.08, 0.385), (0.015, 0.015, 0.045), rot=Matrix.Rotation(-0.4, 3, 'Y'))
    part(m, bm, lambda c, n: (2, shade(C['quartz'], 0.95 + 0.08 * n.z)))
    return m

# ------------------------------------------------------------------ build everything
pine_mature('pine_a', 5.0, 1, n_tufts=10, lean=(0.08, 0.04))
pine_mature('pine_b', 5.5, 2, n_tufts=9, lean=(-0.12, 0.06))
pine_young('pine_c', 4.1, 3)
oak('oak_a', 3.6, 4, spread=1.0)
oak('oak_b', 4.15, 5, spread=0.85)
redbud('redbud_a', 2.05, 6)
redbud('redbud_b', 2.35, 7)
dogwood('dogwood_a', 2.1, 8)
dogwood('dogwood_b', 2.4, 9)
person('person'); person('person_sit', sit=True); bear(); bear_statue()
horse(); teacup(); log_boat(); coaster_car('coaster_car'); coaster_car('coaster_car_lead', lead=True); inner_tube()
rock('rock_a', (1.15, 0.9, 0.52), 61, C['novac'], C['lichen'], cuts=8, target=90)
rock('rock_b', (0.78, 0.62, 0.44), 62, C['sand'], C['moss'], cuts=6, target=84, layered=True, flat_top=True)
rock('rock_c', (0.4, 0.34, 0.46), 63, C['novac'], C['lichen'], cuts=6, target=90, extra=[((0.21, 0.12, 0), (0.2, 0.17, 0.15), 0.6)])
stump(); log_pile(); ore_cart()

# ------------------------------------------------------------------ finalize: clean, .blend objects, export
def clean(m):
    keep = []
    for t in m.tris:
        ks = {(round(p.x, 5), round(p.y, 5), round(p.z, 5)) for p in t[0]}
        if len(ks) == 3: keep.append(t)
    m.tris = keep

def sway_of(m):
    if m.kind != 'tree': return None
    zmax = max(p.z for t in m.tris for p in t[0])
    return lambda z: max(0.0, min(1.0, z / zmax)) ** 1.5

def to_blender(m):
    # one vertex per corner (exactly what is exported), so authored flat/smooth normals survive unchanged
    verts = [p for t in m.tris for p in t[0]]
    faces = [(3 * i, 3 * i + 1, 3 * i + 2) for i in range(len(m.tris))]
    me = bpy.data.meshes.new(m.name); me.from_pydata(verts, [], faces); me.update()
    me.attributes.new('reg', 'INT', 'FACE').data.foreach_set('value', [t[3] for t in m.tris])
    if m.kind == 'char': me.attributes.new('anim', 'INT', 'FACE').data.foreach_set('value', [t[4] for t in m.tris])
    sw = sway_of(m)
    if sw: me.attributes.new('sway', 'FLOAT', 'POINT').data.foreach_set('value', [sw(v.z) for v in verts])
    ca = me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    for i, t in enumerate(m.tris):
        c = (t[2][0] / 255, t[2][1] / 255, t[2][2] / 255, 1.0)
        for j in range(3): ca.data[i * 3 + j].color_srgb = c
    me.color_attributes.active_color = ca
    me.polygons.foreach_set('use_smooth', [True] * len(faces))
    me.normals_split_custom_set([tuple(n) for t in m.tris for n in t[1]])
    ob = bpy.data.objects.new(m.name, me); OUTC.objects.link(ob)
    ob['kind'] = m.kind
    mat = bpy.data.materials.get('vcol') or bpy.data.materials.new('vcol')
    me.materials.append(mat)
    return ob

def b64(b): return base64.b64encode(b).decode('ascii')

def export(m):
    pos, nrm, col, reg, anim, sway = [], [], [], [], [], []
    sw = sway_of(m)
    for ps, ns, c, r, a in m.tris:
        for p, n in zip(ps, ns):
            pos += [p.x, p.z, -p.y]
            nn = Vector((n.x, n.z, -n.y)).normalized()
            nrm += [max(-127, min(127, int(round(v * 127)))) for v in nn]
            col += list(c); reg.append(r); anim.append(a)
            if sw: sway.append(int(round(sw(p.z) * 255)))
    n = len(reg)
    xs, ys, zs = pos[0::3], pos[1::3], pos[2::3]
    d = {'n': n, 'pos': b64(struct.pack('<%df' % len(pos), *pos)), 'nrm': b64(struct.pack('<%db' % len(nrm), *nrm)),
         'col': b64(bytes(col)), 'reg': b64(bytes(reg))}
    if m.kind == 'char': d['anim'] = b64(bytes(anim))
    if sw: d['sway'] = b64(bytes(sway))
    d['bbox'] = [round(v, 4) for v in (min(xs), min(ys), min(zs), max(xs), max(ys), max(zs))]
    return d

for m in MODELS.values(): clean(m)
for m in MODELS.values(): to_blender(m)
out = {name: export(m) for name, m in MODELS.items()}
os.makedirs(os.path.dirname(OUT_JS), exist_ok=True)
with open(OUT_JS, 'w', newline='\n', encoding='utf-8') as fh:
    fh.write('// GENERATED by art-src/blender/build_models.py \u2014 do not edit.\n')
    fh.write('// Non-indexed triangle lists in three.js axes (Y up, front +Z). pos Float32 xyz, nrm Int8 xyz (x127), col Uint8 sRGB,\n')
    fh.write('// reg Uint8 colour region, anim Uint8 limb part (people), sway Uint8 0..255 wind weight (trees).\n')
    fh.write('// Pivots (three.js axes): person hip (+-%.3f, %.3f, 0) shoulder (+-%.3f, %.3f, 0); bear hip (+-%.3f, %.3f, 0) shoulder (+-%.3f, %.3f, 0). +x = character left.\n'
             % (PERSON['hip'] + PERSON['shoulder'] + BEAR['hip'] + BEAR['shoulder']))
    fh.write('window.SCT_MODELS = {\n')
    fh.write(',\n'.join('  %s: %s' % (json.dumps(k), json.dumps(v, separators=(',', ':'))) for k, v in out.items()))
    fh.write('\n};\n')

# remove scratch data and save the source .blend
for ob in list(SCRATCH.objects): bpy.data.objects.remove(ob)
bpy.data.collections.remove(SCRATCH)
for t in list(bpy.data.textures): bpy.data.textures.remove(t)
for me in list(bpy.data.meshes):
    if me.users == 0: bpy.data.meshes.remove(me)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)

print('MODELS')
for name, m in MODELS.items():
    bb = out[name]['bbox']
    print('  %-18s tris %4d  h %.3f  w %.3f  d %.3f' % (name, len(m.tris), bb[4] - bb[1], bb[3] - bb[0], bb[5] - bb[2]))
print('TOTAL tris', sum(len(m.tris) for m in MODELS.values()), 'file bytes', os.path.getsize(OUT_JS))
