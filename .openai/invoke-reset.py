import sys,json,termios,urllib.request,urllib.error
attrs=termios.tcgetattr(sys.stdin)
new=termios.tcgetattr(sys.stdin);new[3]&=~termios.ECHO;termios.tcsetattr(sys.stdin,termios.TCSANOW,new)
print('Ready for reset authorization on stdin (input hidden).',flush=True)
config=json.loads(sys.stdin.readline())
try:
 req=urllib.request.Request('https://cendres-personnages.armand-masse23.chatgpt.site/api/maintenance-reset',data=b'DELETE_CAMPAIGNS_AND_CHARACTERS_KEEP_ACCOUNTS',headers={'Authorization':'Bearer '+config['token'],'Content-Type':'text/plain'},method='POST')
 with urllib.request.urlopen(req,timeout=45) as r: print(json.dumps({'status':r.status,'result':json.loads(r.read())}),flush=True)
except urllib.error.HTTPError as e:
 print(json.dumps({'status':e.code,'body':e.read().decode()[:500]}),flush=True)
 sys.exit(1)
finally: termios.tcsetattr(sys.stdin,termios.TCSANOW,attrs)
