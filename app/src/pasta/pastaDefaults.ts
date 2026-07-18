import type { PastaData } from '../types/project'

export function emptyPastaData(): PastaData {
  return {
    stage1: { businessObjectives: '', complianceRequirements: '', riskTolerance: '', keyStakeholders: '' },
    stage2: { technologies: '', thirdPartyDependencies: '', networkNotes: '' },
    stage3: { entryPoints: '', trustLevelNotes: '' },
    stage4: { threatAgents: '', attackScenarios: '' },
    stage5: { knownVulnerabilities: '', mappingNotes: '' },
    stage6: { attackTrees: '', simulationNotes: '' },
    stage7: { businessImpact: '', residualRisk: '', countermeasures: '' },
  }
}

/** Fills in any stage/field missing from a saved project (new field added
 *  after the project was created, or the whole `pasta` object predates this
 *  feature) with empty defaults, same pattern as the diagram/threats
 *  normalization elsewhere. */
export function normalizePasta(pasta: Partial<PastaData> | undefined): PastaData {
  const empty = emptyPastaData()
  if (!pasta) return empty
  return {
    stage1: { ...empty.stage1, ...pasta.stage1 },
    stage2: { ...empty.stage2, ...pasta.stage2 },
    stage3: { ...empty.stage3, ...pasta.stage3 },
    stage4: { ...empty.stage4, ...pasta.stage4 },
    stage5: { ...empty.stage5, ...pasta.stage5 },
    stage6: { ...empty.stage6, ...pasta.stage6 },
    stage7: { ...empty.stage7, ...pasta.stage7 },
  }
}
