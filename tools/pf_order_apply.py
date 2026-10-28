import os, sys, json

def _apply_pf_order(o):
    import shutil, datetime
    po = o.get("profile_order") if isinstance(o, dict) else None
    if not isinstance(po, list) or not po:
        return 0
    D = os.path.dirname(os.path.abspath(__file__))
    PROF = os.path.join(D, "data", "profiles.json")
    if not os.path.exists(PROF):
        print("no profiles.json", file=sys.stderr)
        return 0
    bak = PROF + ".bak_" + datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    shutil.copy2(PROF, bak)
    data = json.load(open(PROF, encoding="utf-8"))
    members = data.get("members") or {}
    seen = set()
    new = []
    for name in po:
        if isinstance(name, str) and name in members and name not in seen:
            new.append(name)
            seen.add(name)
    for name in (data.get("order") or list(members.keys())):
        if name in members and name not in seen:
            new.append(name)
            seen.add(name)
    if new == data.get("order"):
        print("order unchanged")
        return 0
    data["order"] = new
    data["updated"] = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y-%m-%d %H:%M")
    tmp = PROF + ".tmp"
    json.dump(data, open(tmp, "w"), ensure_ascii=False, indent=1)
    os.replace(tmp, PROF)
    print("order updated", len(new))
    return 1
