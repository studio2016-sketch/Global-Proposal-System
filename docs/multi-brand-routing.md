# Multi-brand routing

The proposal engine is shared infrastructure. Brand websites remain the public front doors.

Each brand configuration defines its public host, discovery entry point, proposal path, post-close destination, pipeline and service families. The engine owns discovery logic, proposal state, commercial authorization, acceptance truth and closing orchestration.

Preferred production pattern: brand-native paths such as studio2016.com/proposal/<token> or jermainewilliams.com/proposal/<token> rewrite/proxy to the shared proposal engine. This preserves brand continuity without copying commercial logic into each repository.

Do not duplicate pricing, approval or acceptance logic inside brand sites. Brand sites may initiate discovery and render branded entry points; commercial truth remains centralized.

Rollout should occur brand-by-brand only after authentication, persistence, secure token lookup and production acceptance storage are active.