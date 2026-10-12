# IronPulse ERD

Trainer specialties and nutrition questionnaire/plan payloads are stored as JSON to keep the local SQLite schema portable. Membership and sponsor ownership links can be detached during account anonymization while retaining financial and sponsor aggregates.

```mermaid
ERDiagram
  USER ||--o{ REFRESH_TOKEN : has
  USER ||--o{ EMAIL_VERIFICATION_TOKEN : has
  USER ||--o{ PASSWORD_RESET_TOKEN : has
  USER ||--o| PROFILE : has
  USER ||--o{ MEMBERSHIP : has
  USER ||--o{ WORKOUT_LOG : logs
  USER ||--o{ NUTRITION_QUESTIONNAIRE : fills
  USER ||--o{ NUTRITION_PLAN : owns
  USER ||--o{ NUTRITION_GENERATION_QUOTA : generates
  USER ||--o{ TRAINER_AVAILABILITY : defines
  USER ||--o{ SPONSOR : has
  USER ||--o{ AUDIT_LOG : creates
  USER ||--o{ APPOINTMENT : attends
  USER ||--o{ TRAINER_CLIENT : assigned
  USER ||--o{ PAYMENT_RECORD : confirms

  MEMBERSHIP_PLAN ||--o{ MEMBERSHIP : contains
  MEMBERSHIP ||--o{ PAYMENT_RECORD : has
  MEMBER ||--o{ TRAINER_CLIENT : assigned
  TRAINER ||--o{ TRAINER_CLIENT : manages
  TRAINER ||--o{ APPOINTMENT : handles
  MACHINE ||--o{ EXERCISE : contains
  MACHINE ||--o{ MACHINE_MUSCLE : includes
  EXERCISE ||--o{ WORKOUT_LOG : used_for
  WORKOUT_LOG ||--o{ WORKOUT_SET : has
  NUTRITION_QUESTIONNAIRE ||--o| NUTRITION_PLAN : generates
  SPONSOR ||--o{ SPONSOR_OFFER : provides
  SPONSOR ||--o| SPONSOR_STAT : aggregates
```

Trainer availability uses UTC weekdays and minutes after midnight. Nutrition generation quotas are unique per member and UTC day; deleting a plan does not remove its quota record.
