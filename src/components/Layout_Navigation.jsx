export default function Layout_Navigation({
  projects,
  activeProjectId,
  activeScenarioId,
  onCreateProject,
  onEditProject,
  onCreateScenario,
  onSelectScenario
}) {
  return (
    <nav slot="navigation" id="sidebar" aria-label="Project navigation">
      <div className="projects wa-stack wa-gap-l">
        <section className="wa-stack wa-gap-s">
          <h2 className="font-size-m wa-cluster wa-gap-xs">
            <wa-icon name="folder" variant="solid" aria-hidden="true"></wa-icon>
            Projects
          </h2>

          <wa-button appearance="outlined" class="nav-action" size="s" pill onClick={onCreateProject}>
            <wa-icon slot="start" name="plus" variant="solid" aria-hidden="true"></wa-icon>
            New Project
          </wa-button>
        </section>

        {projects.map((project) => {
          const projectIsActive = project.id === activeProjectId;

          return (
            <section className="wa-stack wa-gap-2xs" key={project.id}>
              <wa-button
                appearance={projectIsActive ? "filled-outlined" : "outlined"}
                class="action-project"
                size="m"
                pill
                aria-current={projectIsActive ? "true" : undefined}
                onClick={() => onEditProject(project)}
              >
                <wa-icon slot="start" name={project.icon || "mobile-alt"} variant="solid" aria-hidden="true"></wa-icon>
                {project.name}
              </wa-button>

              <wa-button appearance="plain" class="action-scenario" size="s" pill onClick={() => onCreateScenario(project)}>
                <wa-icon slot="start" name="circle-plus" variant="solid" aria-hidden="true"></wa-icon>
                New Scenario
              </wa-button>

              {project.scenarios.map((scenario) => {
                const scenarioIsActive = projectIsActive && scenario.id === activeScenarioId;

                return (
                  <wa-button
                    appearance={scenarioIsActive ? "filled" : "plain"}
                    class="action-scenario"
                    size="s"
                    pill
                    key={scenario.id}
                    aria-current={scenarioIsActive ? "page" : undefined}
                    onClick={() => onSelectScenario(project.id, scenario.id)}
                  >
                    {scenario.name}
                  </wa-button>
                );
              })}
            </section>
          );
        })}
      </div>
    </nav>
  );
}
