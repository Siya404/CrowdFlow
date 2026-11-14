'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type Zone = {
  id: string; short: string; name: string; description: string; inside: number; queued: number;
  capacity: number; wait: number; color: 'mint' | 'red' | 'amber'; x: number; y: number; w: number; h: number;
};
type Visitor = { id: number; token: string; name: string; zoneId: string; group: number; priority: 'Standard' | 'Fast-Track' | 'VIP'; arrival: string };
type Activity = { id: number; kind: 'SUCCESS' | 'INFO' | 'WARNING'; message: string; time: string };

const initialZones: Zone[] = [
  { id: 'ENT', short: 'ENT', name: 'Main Entry Gate', description: 'Primary RFID badge scanning & security bag check.', inside: 85, queued: 2, capacity: 250, wait: 2, color: 'mint', x: 5, y: 39, w: 19, h: 34 },
  { id: 'AUD', short: 'AUD', name: 'Main Auditorium Stage', description: 'Keynotes, creator panels & the evening concert.', inside: 340, queued: 6, capacity: 450, wait: 9, color: 'red', x: 29, y: 10, w: 31, h: 43 },
  { id: 'HCK', short: 'HCK', name: 'Hackathon Arena', description: '48-hour coding pods, mentor desk & hardware lab.', inside: 165, queued: 4, capacity: 200, wait: 10, color: 'red', x: 66, y: 15, w: 28, h: 37 },
  { id: 'EXP', short: 'EXP', name: 'Robotics & Tech Expo', description: 'Drone cages, VR simulators & startup demo booths.', inside: 210, queued: 1, capacity: 300, wait: 2, color: 'amber', x: 7, y: 9, w: 18, h: 22 },
  { id: 'FDC', short: 'FDC', name: 'Food Court Central', description: 'Gourmet food trucks, espresso bar & lounge seating.', inside: 230, queued: 6, capacity: 260, wait: 11, color: 'red', x: 36, y: 65, w: 29, h: 25 },
  { id: 'MRC', short: 'MRC', name: 'Merch & Swag Desk', description: 'Official hoodies, developer kits & VIP pass upgrades.', inside: 65, queued: 1, capacity: 120, wait: 2, color: 'mint', x: 71, y: 65, w: 23, h: 25 },
];
const initialVisitors: Visitor[] = [
  { id: 1, token: '#AUD-101', name: 'Aarav Sharma', zoneId: 'AUD', group: 2, priority: 'VIP', arrival: '2 min ago' },
  { id: 2, token: '#HCK-502', name: 'Team CyberNova', zoneId: 'HCK', group: 4, priority: 'VIP', arrival: '3 min ago' },
  { id: 3, token: '#FDC-205', name: 'Sneha Kapoor', zoneId: 'FDC', group: 3, priority: 'Fast-Track', arrival: '4 min ago' },
  { id: 4, token: '#ENT-409', name: 'Ananya Gupta', zoneId: 'ENT', group: 2, priority: 'Fast-Track', arrival: '5 min ago' },
  { id: 5, token: '#AUD-854', name: 'Meera Reddy', zoneId: 'AUD', group: 4, priority: 'Standard', arrival: '6 min ago' },
  { id: 6, token: '#FDC-311', name: 'Dev & friends', zoneId: 'FDC', group: 3, priority: 'Standard', arrival: '7 min ago' },
  { id: 7, token: '#EXP-208', name: 'Ishita Rao', zoneId: 'EXP', group: 1, priority: 'Standard', arrival: '8 min ago' },
  { id: 8, token: '#MRC-088', name: 'Kabir Shah', zoneId: 'MRC', group: 1, priority: 'Fast-Track', arrival: '9 min ago' },
];
const initialActivity: Activity[] = [
  { id: 1, kind: 'SUCCESS', message: 'Queue token #AUD-854 issued for Meera Reddy (4p) at Main Auditorium Stage · Est. wait: 9m', time: '03:33:52 AM' },
  { id: 2, kind: 'SUCCESS', message: 'Cloud database populated with initial venue & queue telemetry', time: '03:33:47 AM' },
  { id: 3, kind: 'INFO', message: 'Live telemetry initialized for Nexus TechFest 2026', time: 'Just now' },
];
const clockLabel = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function crowdDots(zone: Zone, index: number) {
  const count = Math.min(17, Math.max(4, Math.round(((zone.inside + zone.queued) / zone.capacity) * 21)));
  return Array.from({ length: count }, (_, i) => {
    const seed = (n: number) => { const v = Math.sin((n + 1) * 127.1 + (index + 1) * 311.7) * 43758.5453; return v - Math.floor(v); };
    return <i key={i} className="crowd-dot" style={{ left: `${10 + seed(i * 2) * 80}%`, top: `${25 + seed(i * 2 + 1) * 60}%`, animationDelay: `${(i % 7) * -0.35}s` }} />;
  });
}

export default function Home() {
  const [zones, setZones] = useState(initialZones);
  const [visitors, setVisitors] = useState(initialVisitors);
  const [activity, setActivity] = useState(initialActivity);
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [simulation, setSimulation] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [groupSize, setGroupSize] = useState(1);
  const [priority, setPriority] = useState<Visitor['priority']>('Standard');
  const [queueSearch, setQueueSearch] = useState('');
  const serial = useRef(910);
  const tick = useRef(0);

  const totalInside = zones.reduce((sum, z) => sum + z.inside, 0);
  const totalQueued = zones.reduce((sum, z) => sum + z.queued, 0);
  const totalAtVenue = totalInside + totalQueued;
  const totalCapacity = zones.reduce((sum, z) => sum + z.capacity, 0);
  const avgWait = Math.round(zones.reduce((sum, z) => sum + z.wait, 0) / zones.length);
  const hotspot = zones.reduce((best, z) => (z.inside + z.queued) / z.capacity > (best.inside + best.queued) / best.capacity ? z : best, zones[0]);
  const activeGroups = visitors.reduce((sum, v) => sum + v.group, 0);
  const selected = zones.find(z => z.id === selectedZone);
  const visibleVisitors = useMemo(() => visitors.filter(v => (selectedZone === 'ALL' || v.zoneId === selectedZone) && `${v.name} ${v.token} ${v.zoneId}`.toLowerCase().includes(queueSearch.toLowerCase())), [visitors, selectedZone, queueSearch]);

  const logActivity = (kind: Activity['kind'], message: string) => {
    setActivity(items => [{ id: Date.now() + Math.random(), kind, message, time: clockLabel() }, ...items].slice(0, 12));
  };
  useEffect(() => {
    if (!simulation) return;
    const timer = window.setInterval(() => {
      const i = tick.current++ % initialZones.length;
      setZones(current => current.map((z, index) => index === i ? { ...z, inside: Math.min(z.capacity - z.queued, Math.max(12, z.inside + (tick.current % 5 === 0 ? -3 : 2))) } : z));
      if (tick.current % 3 === 0) setActivity(items => [{ id: Date.now(), kind: 'INFO', message: `Crowd telemetry refreshed · ${initialZones[i].name} · zone density updated`, time: clockLabel() }as Activity, ...items].slice(0, 12));
    }, 2200);
    return () => window.clearInterval(timer);
  }, [simulation]);

  const adjustCrowd = (zoneId: string, amount: number) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;
    const next = amount > 0 ? Math.min(amount, zone.capacity - zone.inside - zone.queued) : -Math.min(-amount, zone.inside);
    if (!next) return;
    setZones(items => items.map(z => z.id === zoneId ? { ...z, inside: z.inside + next } : z));
    logActivity('INFO', `${Math.abs(next)} ${Math.abs(next) === 1 ? 'person' : 'people'} ${next > 0 ? 'added to' : 'exited'} ${zone.name}`);
  };

  const createQueueEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const zone = zones.find(z => z.id === selectedZone) ?? zones[0];
    if (groupSize > zone.capacity - zone.inside - zone.queued) {
      logActivity('WARNING', `${zone.name} is at capacity · check-in could not be issued`);
      return;
    }
    const serialNo = serial.current++;
    const token = `#${zone.id}-${String(serialNo).slice(-3)}`;
    const name = visitorName.trim() || `Walk-in ${String(serialNo).slice(-3)}`;
    const visitor: Visitor = { id: Date.now(), token, name, zoneId: zone.id, group: groupSize, priority, arrival: 'Just now' };
    setVisitors(items => [visitor, ...items]);
    setZones(items => items.map(z => z.id === zone.id ? { ...z, queued: z.queued + groupSize } : z));
    setVisitorName(''); setGroupSize(1); setPriority('Standard');
    logActivity('SUCCESS', `Queue token ${token} issued for ${name} (${groupSize}p) at ${zone.name} · Est. wait: ${zone.wait}m`);
  };

  const admitNext = (visitor: Visitor) => {
    const zone = zones.find(z => z.id === visitor.zoneId);
    setVisitors(items => items.filter(v => v.id !== visitor.id));
    setZones(items => items.map(z => z.id === visitor.zoneId ? { ...z, queued: Math.max(0, z.queued - visitor.group), inside: Math.min(z.capacity, z.inside + visitor.group) } : z));
    logActivity('SUCCESS', `${visitor.token} admitted to ${zone?.name ?? 'venue'} · ${visitor.group} ${visitor.group === 1 ? 'person' : 'people'} checked in`);
  };

  const cancelEntry = (visitor: Visitor) => {
    setVisitors(items => items.filter(v => v.id !== visitor.id));
    setZones(items => items.map(z => z.id === visitor.zoneId ? { ...z, queued: Math.max(0, z.queued - visitor.group) } : z));
    logActivity('WARNING', `${visitor.token} cancelled · ${visitor.name} removed from the virtual queue`);
  };

  const calibrate = () => {
    setSimulation(false); setZones(initialZones); setVisitors(initialVisitors); setSelectedZone('ALL'); setQueueSearch('');
    logActivity('SUCCESS', 'Crowd sensors calibrated · venue counts and queue telemetry synchronized');
  };

  const zoneStatus = (zone: Zone) => {
    const ratio = (zone.inside + zone.queued) / zone.capacity;
    return ratio >= .85 ? 'crowded' : ratio >= .65 ? 'moderate' : 'fast';
  };
  const queueZone = (zoneId: string) => {
    setSelectedZone(zoneId);
    document.getElementById('checkin-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return <main className="ops-shell">
    <header className="ops-header"><div className="ops-header-inner"><div className="product-lockup"><div className="signal-mark"><span>◉</span><i /></div><div className="lockup-copy"><div className="lockup-title">Crowd<span>flow</span><b>LIVE</b></div><div className="lockup-subtitle">Real-time venue heatmap &amp; virtual queue telemetry <code>NODE ID: CF-26-0417</code></div></div></div><div className="header-tools"><span className={`live-state ${simulation ? 'simulating' : ''}`}><i />{simulation ? 'Simulation live' : 'Live telemetry'}</span><button className={`control-button simulate-button ${simulation ? 'is-running' : ''}`} onClick={() => { const next = !simulation; setSimulation(next); logActivity('INFO', next ? 'Live crowd simulation started · telemetry updates every 2.2 seconds' : 'Live crowd simulation paused'); }}><span className="button-light" />{simulation ? 'Pause Simulation' : 'Simulate Live Crowd'}</button><button className="control-button" onClick={calibrate}>⟳ <span>Calibrate</span></button></div></div></header>

    <div className="ops-content">
      <div className="event-strip"><span className="event-badge">NEXUS TECHFEST</span><span>Live operations center</span><span className="strip-separator">/</span><span>Saturday, November 14, 2026</span><span className="strip-right"><span className="pulse-mini" />SYNCED JUST NOW</span></div>

      <section className="stat-grid" aria-label="Live venue summary">
        <article className="stat-card stat-people"><div className="stat-head"><span>Total people at venue</span><span className="stat-icon">♙</span></div><div className="stat-value">{totalAtVenue.toLocaleString()} <small>/ {totalCapacity.toLocaleString()} cap</small></div><div className="stat-foot"><span>Inside zones: <b>{totalInside.toLocaleString()}</b></span><b className="stat-good">{Math.round(totalAtVenue / totalCapacity * 100)}% full</b></div><div className="stat-meter"><i style={{ width: `${Math.min(100, totalAtVenue / totalCapacity * 100)}%` }} /></div></article>
        <article className="stat-card stat-queue"><div className="stat-head"><span>People in active queues</span><span className="stat-icon">▤</span></div><div className="stat-value">{totalQueued} <small className="purple-text">({visitors.length} active tokens)</small></div><div className="stat-foot"><span>VIP / Fast-Track priority enabled</span><b className="stat-good">Live sync</b></div><div className="priority-stack"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
        <article className="stat-card stat-wait"><div className="stat-head"><span>Avg waiting time</span><span className="stat-icon">◷</span></div><div className="stat-value">{avgWait}<small className="unit-amber">mins</small></div><div className="stat-foot"><span>Across all {zones.length} venue checkpoints</span><b className="stat-good">Optimal</b></div><div className="wait-spark"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
        <article className="stat-card stat-hotspot"><div className="stat-head"><span>Peak crowd hotspot</span><span className="stat-icon">♨</span></div><div className="hotspot-name">{hotspot.name}</div><div className="hotspot-foot"><b>{(hotspot.inside + hotspot.queued).toLocaleString()} / {hotspot.capacity} people</b><span>· ~{hotspot.wait}m wait</span></div><button className="text-link" onClick={() => queueZone(hotspot.id)}>Inspect zone queue <span>→</span></button></article>
      </section>

      <section className="primary-grid">
        <article className="surface map-surface"><div className="section-heading map-heading"><div><div className="heading-line"><span className="heading-glyph">⌖</span><h2>Live interactive venue crowd map</h2><span className={`live-chip ${simulation ? 'active' : ''}`}><i />{simulation ? 'SIMULATING' : 'LIVE'}</span></div><p>Select a zone to filter queues, inspect wait times, and monitor crowd density.</p></div><div className="density-legend"><span><i className="legend-fast"/> Fast</span><span><i className="legend-moderate"/> Moderate</span><span><i className="legend-crowded"/> Crowded</span></div></div>
          <div className="map-zone-tabs"><button className={selectedZone === 'ALL' ? 'active' : ''} onClick={() => setSelectedZone('ALL')}>All zones <b>{totalAtVenue.toLocaleString()}</b></button>{zones.map(z => <button key={z.id} className={`${selectedZone === z.id ? 'active' : ''} zone-tab-${zoneStatus(z)}`} onClick={() => setSelectedZone(z.id)}><i />{z.short}<b>{z.inside + z.queued}</b></button>)}</div>
          <div className="map-viewport"><div className="map-lattice"/><div className="map-road road-a"/><div className="map-road road-b"/><div className="map-road road-c"/><div className="map-road road-d"/><div className="map-compass"><span>N</span><i>⌃</i></div><span className="map-waypoint waypoint-a">MAIN WALK</span><span className="map-waypoint waypoint-b">NORTH PLAZA</span><span className="map-waypoint waypoint-c">EAST WALK</span>{zones.map((z, index) => <button key={z.id} className={`map-zone zone-${zoneStatus(z)} ${selectedZone === z.id ? 'zone-selected' : ''} ${selectedZone !== 'ALL' && selectedZone !== z.id ? 'zone-muted' : ''}`} style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%` }} onClick={() => setSelectedZone(selectedZone === z.id ? 'ALL' : z.id)} aria-label={`${z.name}: ${z.inside + z.queued} people, ${z.wait} minute wait`}><span className="map-zone-top"><b>{z.name}</b><em>{z.wait}m</em></span><span className="map-zone-count">{z.inside + z.queued}<small> / {z.capacity}</small></span><span className="map-dots">{crowdDots(z, index)}</span><span className="map-zone-bottom"><span>QUEUE {z.queued}p</span><span>{Math.round((z.inside + z.queued) / z.capacity * 100)}%</span></span></button>)}<div className="map-scale"><i/> 20m <span>Live crowd density · {selected?.name ?? 'all venue zones'}</span></div><div className="map-node-count"><i/> {simulation ? 'STREAMING' : 'TELEMETRY'} <b>{zones.length} NODES</b></div></div>
          <div className="map-footnote"><span><i className="footnote-pulse"/> Showing live venue telemetry across all {zones.length} zones. Click a zone to isolate its queues.</span><span className="map-engine">CROWD RADAR <b>·</b> v2.6</span></div>
        </article>

        <article className="surface checkin-surface" id="checkin-form"><div className="section-heading checkin-heading"><div className="checkin-icon">♧</div><div><div className="heading-line"><h2>Add next person to queue</h2><span className="live-checkin">Live check-in</span></div><p>Issue a live queue token and update zone crowd counts.</p></div></div><form onSubmit={createQueueEntry}><label className="field-label">1. Select venue location / zone</label><select className="field-control zone-select" value={selectedZone === 'ALL' ? zones[0].id : selectedZone} onChange={e => setSelectedZone(e.target.value)}>{zones.map(z => <option key={z.id} value={z.id}>{z.name} — {z.inside + z.queued}/{z.capacity} people · ~{z.wait}m wait</option>)}</select><div className="field-row"><label className="field-group name-field"><span className="field-label">2. Visitor / group name</span><input className="field-control" placeholder="e.g., Kabir Sharma (or leave blank)" value={visitorName} onChange={e => setVisitorName(e.target.value)} /></label><div className="field-group group-field"><span className="field-label">Group size</span><div className="stepper"><button type="button" aria-label="Decrease group size" onClick={() => setGroupSize(n => Math.max(1, n - 1))}>−</button><b>{groupSize}</b><button type="button" aria-label="Increase group size" onClick={() => setGroupSize(n => Math.min(20, n + 1))}>＋</button></div></div></div><div className="field-label priority-label">3. Queue priority tier</div><div className="priority-options">{(['Standard', 'Fast-Track', 'VIP'] as const).map((tier, index) => <button key={tier} type="button" className={`priority-option ${priority === tier ? 'selected' : ''} priority-${index}`} onClick={() => setPriority(tier)}><b>{tier}</b><span>{index === 0 ? 'General admission' : index === 1 ? 'Priority access' : 'Premium entry'}</span>{priority === tier && <i>✓</i>}</button>)}</div><button className="issue-button" type="submit"><span>＋</span> Issue queue token <i>→</i></button><div className="checkin-note"><span>↗</span> Token is added to the live virtual queue immediately.</div></form></article>
      </section>

      <section className="zones-section"><div className="zones-title-row"><div><div className="heading-line"><span className="heading-glyph violet-glyph">▥</span><h2>Crowd count &amp; waiting time by place</h2><span className="zone-count-label">ALL {zones.length} ZONES</span></div><p>Live headcount, active queue lineup, capacity load, and estimated wait time for each checkpoint.</p></div><span className="updated-label"><i/> Updates every 2.2s {simulation && '· simulator on'}</span></div><div className="zone-card-grid">{zones.map(z => { const status = zoneStatus(z); const total = z.inside + z.queued; return <article key={z.id} className={`zone-card zone-card-${status} ${selectedZone === z.id ? 'selected-zone-card' : ''}`}><div className="zone-card-heading"><span className="zone-code">{z.short}</span><div className="zone-card-title"><h3>{z.name}</h3><p>{z.description}</p></div><span className={`flow-badge ${status}`}>{status === 'fast' ? 'Smooth / Fast' : status === 'moderate' ? 'Moderate flow' : 'High congestion'}</span></div><div className="zone-stats"><div><span>Total here</span><b>{total.toLocaleString()}</b><small>/{z.capacity} cap</small></div><div><span>In queue</span><b className="queue-number">{z.queued}</b><small>({visitors.filter(v => v.zoneId === z.id).length} groups)</small></div><div><span>Avg wait</span><b className="wait-number">{z.wait}m</b><small>~{(z.queued / 2.5).toFixed(1)}m/p</small></div></div><div className="capacity-label"><span>Zone capacity load ({z.inside} inside + {z.queued} queuing)</span><b>{Math.round(total / z.capacity * 100)}%</b></div><div className="capacity-track"><i className={status} style={{ width: `${Math.min(100, total / z.capacity * 100)}%` }}/></div><div className="zone-card-actions"><button className="crowd-adjust" onClick={() => adjustCrowd(z.id, -1)}>− <span>1 Crowd</span></button><button className="crowd-adjust add-crowd" disabled={total >= z.capacity} onClick={() => adjustCrowd(z.id, 1)}>＋ <span>1 Crowd</span></button><button className="queue-next" onClick={() => queueZone(z.id)}>♧ <span>Queue next</span></button></div></article>; })}</div></section>

      <section className="bottom-grid"><article className="surface lineup-surface"><div className="section-heading bottom-heading"><div><div className="heading-line"><span className="heading-glyph violet-glyph">▤</span><h2>Active virtual queue lineup</h2><span className="zone-count-label">{selectedZone === 'ALL' ? 'ALL VENUE LOCATIONS' : selectedZone}</span></div><p>Admit the next visitor when they reach the venue zone to update wait times.</p></div><span className="queue-token-count">{visitors.length} active tokens</span></div><div className="lineup-toolbar"><label className="queue-search"><span>⌕</span><input placeholder="Search token or visitor name..." value={queueSearch} onChange={e => setQueueSearch(e.target.value)}/></label><button className={`lineup-filter ${selectedZone === 'ALL' ? 'selected' : ''}`} onClick={() => setSelectedZone('ALL')}>All locations</button></div><div className="lineup-list">{visibleVisitors.length ? visibleVisitors.map(v => { const z = zones.find(item => item.id === v.zoneId)!; return <div className="visitor-row" key={v.id}><div className="visitor-token"><b>{v.token}</b><small>Line #{visitors.filter(item => item.zoneId === v.zoneId).findIndex(item => item.id === v.id) + 1}</small></div><div className="visitor-info"><div><b>{v.name}</b><span className={`tier-badge ${v.priority.toLowerCase().replace('-', '')}`}>{v.priority === 'Fast-Track' ? 'Fast-Track' : v.priority}</span><small>· Group of {v.group}</small></div><p><span>⌖</span> {z.name} <i>·</i> <b>◷ Est. wait: {z.wait} mins</b></p></div><button className="admit-button" onClick={() => admitNext(v)}>✓ <span>Admit next</span></button><button className="cancel-visitor" aria-label={`Remove ${v.name} from queue`} onClick={() => cancelEntry(v)}>×</button></div>; }) : <div className="lineup-empty">No visitors match this location or search.</div>}</div><div className="lineup-footer"><span>Showing <b>{visibleVisitors.length}</b> of <b>{visitors.length}</b> queue tokens</span><button onClick={() => { setSelectedZone('ALL'); setQueueSearch(''); }}>Clear filters</button></div></article>
        <article className="surface activity-surface"><div className="section-heading bottom-heading"><div><div className="heading-line"><span className="activity-icon">⌁</span><h2>Live crowd activity feed</h2></div><p>Cloud telemetry &amp; queue events</p></div><span className="feed-live-dot"/></div><div className="activity-feed">{activity.map(item => <div className="activity-entry" key={item.id}><div className={`activity-meta ${item.kind.toLowerCase()}`}><b>{item.kind}</b><time>{item.time}</time></div><p>{item.message}</p></div>)}</div><div className="cloud-status"><div className="cloud-icon">☁</div><div><b>Cloud simulator connected</b><span>All {zones.length} venue nodes reporting</span></div><i/></div></article></section>

      <footer className="ops-footer"><span>© 2026 Crowdflow <i>·</i> NEXUS TECHFEST 2026</span><span><i className="footer-online"/> All telemetry systems operational</span><span>NODE CF-26-0417</span></footer>
    </div>
  </main>;
}
