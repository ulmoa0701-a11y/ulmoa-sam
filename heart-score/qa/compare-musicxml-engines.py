#!/usr/bin/env python3
"""Measure OMR MusicXML against INDEPENDENT synthetic truth; never correct output."""
import argparse
import json
from pathlib import Path
import zipfile
import xml.etree.ElementTree as ET

NAMES = {"C":"도","D":"레","E":"미","F":"파","G":"솔","A":"라","B":"시"}

def extract_xml(path):
    path=Path(path)
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as z:
            names=[n for n in z.namelist() if n.lower().endswith((".xml",".musicxml")) and not n.startswith("META-INF/")]
            try:
                meta=ET.fromstring(z.read("META-INF/container.xml"))
                main=next((x.get("full-path") for x in meta.iter() if x.tag.endswith("rootfile")),None)
                if main in names:names.remove(main);names.insert(0,main)
            except (KeyError,ET.ParseError):pass
            if not names:raise ValueError("MXL has no score file")
            data=z.read(names[0])
    else:data=path.read_bytes()
    root=ET.fromstring(data)
    for element in root.iter():
        element.tag=element.tag.split("}")[-1]
    if root.tag!="score-partwise":raise ValueError("Expected score-partwise MusicXML")
    parts=root.findall("part")
    if not parts:raise ValueError("No score parts in MusicXML")
    results=[]
    for part in parts:
        divisions=1.;measures=[]
        for measure in part.findall("measure"):
            events=[]
            for item in measure:
                if item.tag=="attributes":
                    v=item.findtext("divisions")
                    if v:divisions=float(v)
                if item.tag!="note":continue
                duration=item.findtext("duration")
                if duration is None:
                    if item.find("grace") is not None:continue
                    raise ValueError("Note without duration")
                if item.find("rest") is not None:name="쉼"
                else:
                    pitch=item.find("pitch")
                    if pitch is None:raise ValueError("Unknown pitch")
                    step=pitch.findtext("step");octave=int(pitch.findtext("octave"))
                    alteration=float(pitch.findtext("alter","0"))
                    if step not in NAMES:raise ValueError("Bad pitch step")
                    name=NAMES[step]+("#" if alteration==1 else "♭" if alteration==-1 else "" if alteration==0 else f"({alteration:+g})")
                    name=("높은" if octave>=5 else "낮은" if octave<4 else "")+name
                if divisions<=0:raise ValueError("Invalid divisions")
                events.append({"note":name,"dur":round(float(duration)/divisions,5)})
            measures.append(events)
        results.append(measures)
    return results

def compare(truth,actual):
    expected=truth["measures"];missing=extra=pitch=rhythm=exact=0;issues=[]
    for i in range(max(len(expected),len(actual))):
        want=expected[i] if i<len(expected) else []
        got=actual[i] if i<len(actual) else []
        diff=[]
        for j in range(max(len(want),len(got))):
            if j>=len(got):missing+=1;diff.append({"event":j+1,"missing":want[j]})
            elif j>=len(want):extra+=1;diff.append({"event":j+1,"extra":got[j]})
            else:
                if want[j]["note"]!=got[j]["note"]:
                    pitch+=1;diff.append({"event":j+1,"pitch":[want[j]["note"],got[j]["note"]]})
                if abs(want[j]["dur"]-got[j]["dur"])>.001:
                    rhythm+=1;diff.append({"event":j+1,"duration":[want[j]["dur"],got[j]["dur"]]})
        if not diff:exact+=1
        else:issues.append({"measure":i+1,"differences":diff})
    notes=sum(x["note"]!="쉼" for measure in actual for x in measure)
    rests=sum(x["note"]=="쉼" for measure in actual for x in measure)
    errors=missing+extra+pitch+rhythm
    return {"exact":errors==0 and len(actual)==len(expected),
            "expectedMeasures":len(expected),"measures":len(actual),
            "exactMeasures":exact,"notes":notes,"rests":rests,
            "expectedNotes":truth["noteCount"],"expectedRests":truth["restCount"],
            "missingEvents":missing,"extraEvents":extra,
            "pitchRestErrors":pitch,"durationErrors":rhythm,
            "totalErrors":errors,"perMeasure":issues}

def main():
    p=argparse.ArgumentParser()
    for arg in ("truth","xml","engine","variant","output"):p.add_argument("--"+arg,required=True)
    a=p.parse_args();record={"engine":a.engine,"variant":a.variant,"xmlFile":Path(a.xml).name}
    try:
        scores=extract_xml(a.xml);truth=json.loads(Path(a.truth).read_text(encoding="utf8"))
        score=[compare(truth,x) for x in scores]
        record.update({"parts":len(scores),"firstPart":score[0],"exact":len(scores)==1 and score[0]["exact"],
                       "otherParts":[{k:v for k,v in x.items() if k!="perMeasure"} for x in score[1:]]})
    except Exception as exc:record.update({"exact":False,"parseError":f"{type(exc).__name__}: {exc}"})
    output=Path(a.output);output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding="utf8")
    print("OMR_BENCH_RESULT="+json.dumps({k:({kk:vv for kk,vv in v.items() if kk!="perMeasure"} if k=="firstPart" else v) for k,v in record.items()},ensure_ascii=False))
if __name__=="__main__":main()
