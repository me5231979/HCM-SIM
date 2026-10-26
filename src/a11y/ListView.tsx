import { onsite } from '../status';
import { useGame } from '../store/game';
import { personStatus } from '../status';
import { InboxList } from '../ui/Inbox';
import { StatusGlyph } from '../ui/icons';
import { activatePerson } from '../scene/actions';

/** 2D alternative to the 3D diorama: the same tasks and people, no WebGL required. */
export function ListView() {
  const s = useGame();
  return (
    <main className="listview" id="main" aria-labelledby="lv-h">
      <h1 id="lv-h" className="sr-only">Role of the HCM, list view</h1>
      <section className="lv-col liquid-glass" aria-labelledby="lv-inbox">
        <h2 id="lv-inbox">Inbox</h2>
        <InboxList compact />
      </section>
      <section className="lv-col liquid-glass" aria-labelledby="lv-people">
        <h2 id="lv-people">People</h2>
        <ul className="lv-people">
          {onsite(s.snap?.time).map((p) => {
            const st = personStatus(p.id, s.game, s.snap);
            return (
              <li key={p.id}>
                {st.stepId && s.phase === 'playing' ? (
                  <button className="lv-person" onClick={() => s.openStep(st.stepId!)}><span><strong>{p.name}</strong><span className="muted">{p.title}</span></span><span className={`chip chip--${st.kind}`}><StatusGlyph kind={st.kind} />{st.label}</span></button>
                ) : p.greeting && s.phase === 'playing' ? (
                  <button className="lv-person" onClick={() => activatePerson(p.id)}><span><strong>{p.name}</strong><span className="muted">{p.title}</span></span>{st.kind !== 'none' ? <span className={`chip chip--${st.kind}`}><StatusGlyph kind={st.kind} />{st.label}</span> : <span className="muted lv-hello">Say hello</span>}</button>
                ) : (
                  <div className="lv-person"><span><strong>{p.name}</strong><span className="muted">{p.title}</span></span>{st.kind !== 'none' && <span className={`chip chip--${st.kind}`}><StatusGlyph kind={st.kind} />{st.label}</span>}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
