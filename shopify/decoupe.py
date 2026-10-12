import re
from html.parser import HTMLParser
VOID = {"area","base","br","col","embed","hr","img","input","link","meta","source","track","wbr","path","circle","rect","stop","line","polyline","polygon","ellipse"}

def line_offsets(text):
    offs=[0]
    for m in re.finditer("\n", text): offs.append(m.end())
    return offs

class Top(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=False)
        self.text=text; self.offs=line_offsets(text); self.depth=0; self.blocks=[]; self.start=None; self.stack=[]
    def pos(self):
        l,c=self.getpos(); return self.offs[l-1]+c
    def handle_starttag(self, tag, attrs):
        selfclosing = self.get_starttag_text().endswith("/>")
        if tag in VOID or selfclosing:
            if self.depth==0:
                p=self.pos(); self.blocks.append((p,p+len(self.get_starttag_text())))
            return
        if self.depth==0: self.start=self.pos()
        self.depth+=1; self.stack.append(tag)
    def handle_endtag(self, tag):
        if tag in VOID: return
        # pop until match
        while self.stack:
            t=self.stack.pop(); self.depth-=1
            if t==tag: break
        if self.depth==0 and self.start is not None:
            end=self.pos()+len("</%s>"%tag)
            self.blocks.append((self.start,end)); self.start=None

def top_blocks(text):
    p=Top(text); p.feed(text); p.close()
    return [text[a:b] for a,b in p.blocks], p.blocks
