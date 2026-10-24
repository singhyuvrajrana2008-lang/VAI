# Repository Setup

Repository: https://github.com/singhyuvrajrana2008-lang/VAI

## 1. Shared source of truth
Use this single repository for all code and documents. Do not create alternate repositories for the same project. Keep main reviewable and runnable.

## 2. Local setup
Clone the repository, install the runtime appropriate to the implemented frontend/backend, and copy .env.example into a local environment file. Do not commit local environment files or secrets.

No app runtime is claimed to exist until the implementation agents add it. Setup commands must be updated only after being executed successfully.

## 3. Branch workflow
- Pull latest main.
- Create a scoped branch: feat/<task>, data/<task>, docs/<task>, or fix/<task>.
- Read AGENTS.md and assigned docs.
- Edit only owned files.
- Run relevant tests and record actual output.
- Commit small changes.
- Open a pull request to main.
- Request review for API/schema/migration changes.
- Merge only after the project lead approves and acceptance checks pass.

## 4. Agent handoff
Every prompt begins with a repository check and requires the agent to confirm:
- Repository name and branch.
- Assigned workstream and files.
- API/schema contracts it will use.
- Expected deliverable.
- Tests required.

If an agent cannot access GitHub directly, it must state so and provide a patch/commit-ready output. It must not claim to have pushed work.

## 5. Secrets
Never commit .env, Supabase service-role keys, provider credentials, private tokens, user data or raw protected datasets. Put only variable names and descriptions in .env.example.

## 6. Definition of done
A task is complete only when its files are in the shared repo/branch, relevant tests have actually run, interfaces are documented, DEMO/LIVE semantics are honest, and remaining gaps are recorded.
