f=open('frontend/src/components/SymptomChat.jsx','r',encoding='utf-8')
c=f.read();f.close()
old='flex flex-col items-center"><div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto px-4'
new='flex flex-col items-center"><div className="w-full max-w-lg mx-auto px-4 pt-4"><button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition"><Ic.back/></button></div><div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto px-4'
if old in c:
    c=c.replace(old,new)
    f=open('frontend/src/components/SymptomChat.jsx','w',encoding='utf-8')
    f.write(c);f.close()
    print('OK')
else:
    print('NOT FOUND')
