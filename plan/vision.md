# Vision

## Project Name
AI Climbing Coach (working title)

## Problem
Most climbers do not have access to consistent coaching. They struggle to turn goals, current ability, and available time into a structured weekly training plan they can follow.

## Target Users
- Beginner to advanced climbers who want guided training
- Busy adults who need efficient, personalized sessions
- Climbers without regular access to an in-person coach

## Value Proposition
Provide personalized climbing training plans in minutes using AI, then let users track and regenerate plans as they improve. Compared to generic templates, plans are individualized to goals, schedule, equipment, and climbing level.

## Success Metrics
- 7-day activation rate: % of new users who generate their first plan
- Subscription conversion: % of trial/free users who start paid plan
- Plan adherence: average completed activities per week per active user
- Completion rate: % of planned session activities marked complete

## Launch Criteria
- User can sign up, log in, and manage account
- User can complete onboarding questionnaire
- System can generate and store a structured weekly plan as JSON (`week -> session -> activities`)
- User can create multiple plans over time
- User can soft-delete plans (hidden from active UI while retained for audit/history)
- Authenticated homepage lists a user's plans with a clear "Create Plan" action
- User can view plan in web UI
- User can tick off completed sessions and completed session activities
- User can request plan tweaks for a specific week or whole plan and receive an updated plan + change summary
- User can chat with AI about a plan in a dedicated plan-page chat panel without auto-modifying the plan
- Core app experience works on both mobile and desktop
- Automated unit + integration tests pass in CI, and manual mobile/desktop smoke tests pass before release
- Core product is stable for early-access users without billing
