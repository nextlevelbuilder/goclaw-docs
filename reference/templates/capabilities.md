# CAPABILITIES.md Template

> Domain knowledge, technical skills, and specialized expertise — what your agent can DO.

## Overview

`CAPABILITIES.md` is your agent's **expertise resume**. It lists areas of deep knowledge, preferred tools, and methodologies — separate from personality (`SOUL.md`) and identity (`IDENTITY.md`).

GoClaw loads this file in the **Project Context** section of the system prompt on every session, including minimal mode (subagents, cron, heartbeat). It is also referenced from `SOUL.md` (line 39: *"For domain expertise and technical skills, see CAPABILITIES.md"*).

**Scope:**
- Open agents: per-user (each user defines their agent's expertise)
- Predefined agents: agent-level (shared expertise across all users)

**Why separate from SOUL.md?** SOUL.md covers *who* the agent is — personality, tone, opinions. CAPABILITIES.md covers *what* the agent can do — skills, knowledge domains, tools. This separation lets you update expertise without touching personality, and vice versa.

---

## Default Template

```markdown
# CAPABILITIES.md - What You Can Do

_Domain knowledge, technical skills, and specialized expertise._

## Expertise

_(Describe your areas of expertise. What do you know deeply? What can you help with?)_

## Tools & Methods

_(Optional — preferred tools, workflows, methodologies you follow.)_

---

_Updated by evolution or user edits. Focus on what you DO, not who you ARE (that's SOUL.md)._
```

---

## Customized Example

A CAPABILITIES.md for a DevOps assistant:

```markdown
# CAPABILITIES.md - What You Can Do

## Expertise

- Infrastructure as Code: Terraform, Pulumi, CloudFormation
- CI/CD: GitHub Actions, GitLab CI, Jenkins pipelines
- Container orchestration: Kubernetes, Docker Compose, ECS
- Cloud: AWS (EC2, S3, RDS, Lambda), GCP (GKE, Cloud Run)
- Monitoring: Prometheus, Grafana, Datadog
- Database administration: PostgreSQL, MySQL, Redis

## Tools & Methods

- GitOps workflow: all infra changes via PR → plan → apply
- Blue-green deployments for production services
- Weekly cost review every Friday at 10am
- Always validate Terraform plan before apply
```

---

## Tips

- **Be specific** — "Terraform with AWS EKS" is better than "Cloud infrastructure"
- **Update regularly** — add new skills as the agent learns, remove outdated ones
- **Reference environment** — mention specific cluster names, repo URLs, or tool versions
- **Evolution can update this** — the agent evolution system can append capabilities as it observes successful work patterns

---

## What's Next

- [SOUL.md Template](/template-soul) — the personality file that references CAPABILITIES.md
- [IDENTITY.md Template](/template-identity) — name, emoji, and nature of your agent
- [TOOLS.md Template](/template-tools) — environment-specific tool notes

<!-- goclaw-source: 1296cdbf | updated: 2026-04-11 -->
