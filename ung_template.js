[1mdiff --git a/src/components/ConstructionList.jsx b/src/components/ConstructionList.jsx[m
[1mindex 1d35097..645305f 100644[m
[1m--- a/src/components/ConstructionList.jsx[m
[1m+++ b/src/components/ConstructionList.jsx[m
[36m@@ -17,18 +17,29 @@[m [mfunction ConstructionList() {[m
   const tableRowHover = isDark ? '#4cafef33' : '#e3f2fd';[m
   const inputBg = isDark ? '#232733' : '#fff';[m
 [m
[32m+[m[32m  // 검색 필터링[m
   const filtered = sites.filter(site =>[m
     site.name.includes(search) ||[m
     site.manager.includes(search) ||[m
     site.address.includes(search)[m
   );[m
 [m
[32m+[m[32m  // 최신순 정렬 (createdAt 또는 id 기준)[m
[32m+[m[32m  const sortedSites = [...filtered].sort((a, b) => {[m
[32m+[m[32m    // createdAt이 있으면 createdAt 기준으로 정렬[m
[32m+[m[32m    if (a.createdAt && b.createdAt) {[m
[32m+[m[32m      return new Date(b.createdAt) - new Date(a.createdAt);[m
[32m+[m[32m    }[m
[32m+[m[32m    // createdAt이 없으면 id 기준으로 정렬 (Firebase ID는 시간순으로 생성됨)[m
[32m+[m[32m    return b.id.localeCompare(a.id);[m
[32m+[m[32m  });[m
[32m+[m
   const handleSelect = id => {[m
     setSelected(sel => sel.includes(id) ? sel.filter(s => s !== id) : [...sel, id]);[m
   };[m
   const handleSelectAll = () => {[m
[31m-    if (selected.length === filtered.length) setSelected([]);[m
[31m-    else setSelected(filtered.map(s => s.id));[m
[32m+[m[32m    if (selected.length === sortedSites.length) setSelected([]);[m
[32m+[m[32m    else setSelected(sortedSites.map(s => s.id));[m
   };[m
   const handleDeleteSelected = () => {[m
     if (selected.length > 0) {[m
[36m@@ -62,7 +73,7 @@[m [mfunction ConstructionList() {[m
         <table style={{ width: '100%', background: bgColor, color: textColor, borderRadius: 8 }}>[m
           <thead>[m
             <tr style={{ background: tableHeadBg }}>[m
[31m-              <th style={{ padding: 8 }}><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={handleSelectAll} /></th>[m
[32m+[m[32m              <th style={{ padding: 8 }}><input type="checkbox" checked={selected.length === sortedSites.length && sortedSites.length > 0} onChange={handleSelectAll} /></th>[m
               <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>현장명</th>[m
               <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>상태</th>[m
               <th style={{ padding: 8, fontWeight: 700, fontSize: 15 }}>착공일</th>[m
[36m@@ -76,7 +87,7 @@[m [mfunction ConstructionList() {[m
             </tr>[m
           </thead>[m
           <tbody>[m
[31m-            {filtered.map(site => ([m
[32m+[m[32m            {sortedSites.map(site => ([m
               <tr key={site.id} style={{ borderBottom: `1px solid ${borderColor}`, background: selected.includes(site.id) ? tableRowHover : undefined }}>[m
                 <td style={{ padding: 8 }}><input type="checkbox" checked={selected.includes(site.id)} onChange={() => handleSelect(site.id)} /></td>[m
                 <td style={{ padding: 8 }}>{site.name}</td>[m
