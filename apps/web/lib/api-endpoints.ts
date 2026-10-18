export const apiEndpoints = {
  memberProfile: '/me/profile',
  membership: '/memberships/me',
  machines: {
    list: '/machines',
    detail: (slug: string) => `/machines/${encodeURIComponent(slug)}`,
    exercises: (slug: string) =>
      `/machines/${encodeURIComponent(slug)}/exercises`,
  },
  workouts: {
    collection: '/workouts',
    personalRecords: '/workouts/personal-records',
    progress: (exerciseId: string) =>
      `/workouts/exercises/${encodeURIComponent(exerciseId)}/progress`,
  },
} as const;
