-- WGOS one native project per proposal
CREATE UNIQUE INDEX IF NOT EXISTS projects_proposal_id_key
  ON wgos.projects(proposal_id)
  WHERE proposal_id IS NOT NULL;
