export default function Card_ScenarioLibrary({ scenarioPacks, activePack }) {
  return (
    <wa-card className="surface-card">
      <div slot="header" className="card-header">
        <div>
          <p className="eyebrow">Scenarios</p>
          <h2>Scenario library</h2>
        </div>
        <wa-badge appearance="outlined" variant="brand">{activePack.name}</wa-badge>
      </div>

      <div className="scenario-list">
        {scenarioPacks.map((pack) => (
          <article key={pack.id} className={pack.id === activePack.id ? "scenario-item active" : "scenario-item"}>
            <div>
              <h3>{pack.name}</h3>
              <p>{pack.description}</p>
            </div>
            <wa-badge appearance="outlined">{pack.command}</wa-badge>
          </article>
        ))}
      </div>
    </wa-card>
  );
}
