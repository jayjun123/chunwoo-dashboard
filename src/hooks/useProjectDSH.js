import { useState, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

/** 일정 desc에서 명수 추출 (히트맵과 동일) */
function extractManpowerFromDescription(description) {
  if (!description) return 0;
  const str = String(description);
  const match명 = str.match(/(\d+)명/g);
  if (match명) return match명.reduce((s, m) => s + (parseInt(m.replace('명', ''), 10) || 0), 0);
  const match인 = str.match(/(\d+)인/g);
  if (match인) return match인.reduce((s, m) => s + (parseInt(m.replace('인', ''), 10) || 0), 0);
  return 0;
}

/**
 * 현장(siteId) 기준 Firebase 실시간 데이터 훅
 * - sites (현장 1건)
 * - progress + gisung (기성: 현장명 name + siteId 둘 다 조회 후 병합)
 * - costs (지출: site 또는 siteId로 매칭)
 * - schedules: 히트맵과 동일하게 투입일수·공수 계산
 */
export function useProjectDSH(siteId) {
  const [site, setSite] = useState(null);
  const [progressList, setProgressList] = useState([]);
  const [costs, setCosts] = useState([]);
  const [quantityInfo, setQuantityInfo] = useState([]);
  const [scheduleWorkDays, setScheduleWorkDays] = useState(0);
  const [scheduleTotalManpower, setScheduleTotalManpower] = useState(0);
  const [loading, setLoading] = useState(!!siteId);
  const [error, setError] = useState(null);

  const progressRef = useRef([]);
  const gisungByNameRef = useRef([]);
  const gisungByIdRef = useRef([]);

  useEffect(() => {
    if (!siteId) {
      setSite(null);
      setProgressList([]);
      setCosts([]);
      setQuantityInfo([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubSite = onSnapshot(
      doc(db, 'sites', siteId),
      (snap) => {
        setSite(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    const unsubQty = onSnapshot(
      query(collection(db, 'quantity_info'), where('siteId', '==', siteId)),
      (snap) => setQuantityInfo(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );

    setLoading(false);
    return () => {
      unsubSite();
      unsubQty();
    };
  }, [siteId]);

  // 기성: progress(현장명) + gisung(현장명 + siteId 병합)
  useEffect(() => {
    const flush = () => {
      const byId = new Map();
      progressRef.current.forEach((d) => byId.set(d.id, d));
      gisungByNameRef.current.forEach((d) => byId.set(d.id, d));
      gisungByIdRef.current.forEach((d) => byId.set(d.id, d));
      setProgressList(Array.from(byId.values()));
    };

    if (!siteId) {
      setProgressList([]);
      return () => {};
    }

    const unsubs = [];

    if (site?.name) {
      const qProgress = query(collection(db, 'progress'), where('name', '==', site.name));
      unsubs.push(
        onSnapshot(
          qProgress,
          (snap) => {
            progressRef.current = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            flush();
          },
          () => {}
        )
      );
      const qGisungName = query(collection(db, 'gisung'), where('name', '==', site.name));
      unsubs.push(
        onSnapshot(
          qGisungName,
          (snap) => {
            gisungByNameRef.current = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            flush();
          },
          () => {}
        )
      );
    }

    const qGisungId = query(collection(db, 'gisung'), where('siteId', '==', siteId));
    unsubs.push(
      onSnapshot(
        qGisungId,
        (snap) => {
          gisungByIdRef.current = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          flush();
        },
        () => {}
      )
    );

    if (!site?.name) flush();

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [siteId, site?.name]);

  // costs: 현장명(site) 또는 siteId
  const costBySiteRef = useRef([]);
  const costByIdRef = useRef([]);
  useEffect(() => {
    if (!siteId) {
      setCosts([]);
      return () => {};
    }
    if (!site?.name) {
      costBySiteRef.current = [];
      costByIdRef.current = [];
    }

    const merge = () => {
      const byId = new Map();
      costBySiteRef.current.forEach((c) => byId.set(c.id, c));
      costByIdRef.current.forEach((c) => byId.set(c.id, c));
      setCosts(Array.from(byId.values()));
    };

    const unsubSite = onSnapshot(
      query(collection(db, 'costs'), where('site', '==', site?.name || '\0')),
      (snap) => {
        costBySiteRef.current = site?.name ? snap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
        merge();
      },
      () => {}
    );
    const unsubId = onSnapshot(
      query(collection(db, 'costs'), where('siteId', '==', siteId)),
      (snap) => {
        costByIdRef.current = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        merge();
      },
      () => {}
    );

    return () => {
      unsubSite();
      unsubId();
    };
  }, [siteId, site?.name]);

  // 일정(schedules): 히트맵과 동일하게 현장 투입일수·공수 계산 (오늘 이전만)
  useEffect(() => {
    if (!siteId) {
      setScheduleWorkDays(0);
      setScheduleTotalManpower(0);
      return () => {};
    }

    const q = query(collection(db, 'schedules'), where('siteId', '==', siteId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const daySet = new Set();
        let totalManpower = 0;

        snap.docs.forEach((docSnap) => {
          const d = docSnap.data();
          if (!d.date) return;

          let dateObj;
          if (d.date.toDate) dateObj = d.date.toDate();
          else if (d.date instanceof Date) dateObj = d.date;
          else dateObj = new Date(d.date);
          if (dateObj > today) return;

          const dateStr = dateObj.toISOString().slice(0, 10);
          daySet.add(dateStr);
          totalManpower += extractManpowerFromDescription(d.desc || '');
        });

        setScheduleWorkDays(daySet.size);
        setScheduleTotalManpower(totalManpower);
      },
      () => {
        setScheduleWorkDays(0);
        setScheduleTotalManpower(0);
      }
    );

    return () => unsub();
  }, [siteId]);

  return {
    site,
    progressList,
    costs,
    quantityInfo,
    scheduleWorkDays,
    scheduleTotalManpower,
    loading,
    error,
  };
}
