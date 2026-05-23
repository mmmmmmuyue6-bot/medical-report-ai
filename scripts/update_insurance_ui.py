import re

with open('frontend/src/components/InsurancePage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add AI supplement exams after KB exams
old_exams = '''                )})}
              </div>
            </div>
          )}

          {/* Drugs'''
new_exams = '''                )})}
                {aiAnalysis?.ai_supplement_exams?.map((e, i) => (
                  <div key={'ai-exam-'+i} className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0 bg-purple-50/40 rounded-lg px-2 -mx-2">
                    <div><span className="text-slate-700">{e.name}</span><span className="text-xs text-purple-500 ml-1.5">[AI补充,需核实]</span></div>
                    <div className="text-right"><span className="text-purple-500 text-xs block">{e.frequency}</span><span className="text-purple-600 text-xs">约 {e.cost_estimate}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drugs'''
if old_exams in content:
    content = content.replace(old_exams, new_exams)
    print('Exams: AI supplement added')
else:
    print('WARNING: Exams section not found')

# 2. Treatment paths - find by pattern
# The old pattern has "知识库" badge, need to add AI supplement
old_paths_header = '<span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">知识库</span>\n              </div>\n              {d.treatment_paths.map((p, i) => (\n                <p key={i} className="text-sm text-slate-600 flex items-start gap-2 mb-1.5">\n                  <span className="text-red-400 mt-1 shrink-0">•</span>{p}\n                </p>\n              ))}\n            </div>\n          )}'

new_paths_footer = '''<div className="flex items-center gap-1.5">
                  {d.treatment_paths?.length > 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">知识库</span>}
                  {aiAnalysis?.ai_supplement_paths?.length > 0 && <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-600">AI补充</span>}
                </div>
              </div>
              {d.treatment_paths?.map((p, i) => (
                <p key={i} className="text-sm text-slate-600 flex items-start gap-2 mb-1.5">
                  <span className="text-red-400 mt-1 shrink-0">{'•'}</span>{p}
                </p>
              ))}
              {aiAnalysis?.ai_supplement_paths?.map((p, i) => (
                <p key={'ai-path-'+i} className="text-sm text-purple-600 flex items-start gap-2 mb-1.5 bg-purple-50/40 rounded-lg px-2 py-1 -mx-1">
                  <span className="text-purple-400 mt-1 shrink-0">{'•'}</span>{p} <span className="text-xs text-purple-400 ml-1">[AI补充,需核实]</span>
                </p>
              ))}
            </div>
          )}'''

# Replace treatment paths with conditional rendering
old_paths_start = "{d.treatment_paths?.length > 0 && ("
new_paths_start = "{(d.treatment_paths?.length > 0 || aiAnalysis?.ai_supplement_paths?.length > 0) && ("
if old_paths_start in content:
    content = content.replace(old_paths_start, new_paths_start)
    print('Treatment paths: condition updated')
else:
    print('WARNING: Treatment paths condition not found')

# Find and replace the old badge + paths
if old_paths_header in content:
    content = content.replace(old_paths_header, new_paths_footer)
    print('Treatment paths: AI supplement added')
else:
    print('WARNING: Treatment paths section not found (trying alternate)')
    # Try with different whitespace
    if '<span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">知识库</span>' in content:
        print('Found知识库 badge but whitespace differs')

# 3. Hospitalization - add AI supplement
old_hosp = """          {/* Hospitalization */}
          {d.hospitalization_scenario && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">住院参考</h3>
              <p className="text-sm text-slate-600">{d.hospitalization_scenario}</p>
            </div>
          )}"""

new_hosp = """          {/* Hospitalization (KB + AI) */}
          {(d.hospitalization_scenario || aiAnalysis?.ai_hospitalization_note) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">住院参考</h3>
              {d.hospitalization_scenario && <p className="text-sm text-slate-600">{d.hospitalization_scenario}</p>}
              {aiAnalysis?.ai_hospitalization_note && (
                <p className="text-sm text-purple-600 mt-2 bg-purple-50/40 rounded-lg px-3 py-2">
                  {aiAnalysis.ai_hospitalization_note} <span className="text-xs text-purple-400 ml-1">[AI补充,需核实]</span>
                </p>
              )}
            </div>
          )}"""

if old_hosp in content:
    content = content.replace(old_hosp, new_hosp)
    print('Hospitalization: updated')
else:
    print('WARNING: Hospitalization not found')

# 4. Insurance notes - add AI supplement
old_ins = """          {/* Insurance Notes */}
          {d.insurance_notes && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">医保提示</h3>
              <p className="text-sm text-amber-700">{d.insurance_notes}</p>
            </div>
          )}"""

new_ins = """          {/* Insurance Notes (KB + AI) */}
          {(d.insurance_notes || aiAnalysis?.ai_insurance_note) && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-amber-800">医保提示</h3>
                {aiAnalysis?.ai_insurance_note && <span className="px-2 py-0.5 rounded-full text-xs bg-amber-200 text-amber-700">AI补充</span>}
              </div>
              {d.insurance_notes && <p className="text-sm text-amber-700">{d.insurance_notes}</p>}
              {aiAnalysis?.ai_insurance_note && (
                <p className="text-sm text-amber-700 mt-2 border-t border-amber-200 pt-2">{aiAnalysis.ai_insurance_note}</p>
              )}
            </div>
          )}"""

if old_ins in content:
    content = content.replace(old_ins, new_ins)
    print('Insurance notes: updated')
else:
    print('WARNING: Insurance notes not found')

with open('frontend/src/components/InsurancePage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
