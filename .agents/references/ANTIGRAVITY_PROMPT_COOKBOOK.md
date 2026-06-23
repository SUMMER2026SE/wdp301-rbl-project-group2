# Antigravity Prompt Cookbook for FOA

## New session

```txt
Read AGENTS.md and all .agents/rules. Then run repo-onboard workflow. Do not edit code yet.
```

## Feature planning

```txt
Use the spec-first-planner skill and run the spec-first workflow.
Task: <feature>
Do not edit code until the spec and atomic slices are clear.
```

## Backend API

```txt
Use express-api-senior and mongodb-commerce-data skills.
Run add-api-endpoint workflow.
Task: <API requirement>
Preserve existing route/controller/service patterns.
```

## Payment

```txt
Use payos-payment-guardian and checkout-order-domain skills.
Task: <payment requirement>
Amount must be server-computed. Webhook/callback must be verified and idempotent.
```

## Frontend

```txt
Use react-food-ui skill.
Task: <UI requirement>
Use React Query for server state and Zustand only for local/client UI state.
```

## Review

```txt
Use code-review-sentinel and security-reviewer skills.
Run review-current-diff workflow.
Block on Critical/High findings.
```

## Update agent knowledge

```txt
Run learn-from-session workflow.
Lesson: <project-specific convention we want the agent to remember>
```
