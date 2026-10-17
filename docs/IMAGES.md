# IronPulse image brief

Place optimized local files in `apps/web/public/images/` using the exact filenames below. The manifest in `apps/web/lib/images.ts` contains localized alternative text, aspect ratios and focal points. Do not replace these local assets with remote image URLs.

The initial local gym photography set is installed in this directory from Pexels under the [Pexels License](https://www.pexels.com/license/). Source pages are listed below. The site serves the downloaded local files; it does not hotlink images.

| Slot | File | Aspect ratio | Recommended minimum | Unsplash / Pexels search keywords |
| --- | --- | --- | --- | --- |
| `hero` | `hero.jpg` | 16:9 | 2560 × 1440 | premium gym interior athlete training dramatic light, modern strength gym |
| `free-weights` | `free-weights.jpg` | 4:3 | 1600 × 1200 | dumbbell rack strength training premium gym, free weights |
| `machines` | `machines.jpg` | 4:3 | 1600 × 1200 | modern strength machines gym interior, selectorized equipment |
| `cardio` | `cardio.jpg` | 4:3 | 1600 × 1200 | cardio equipment gym treadmill interior cinematic |
| `functional` | `functional.jpg` | 4:3 | 1600 × 1200 | functional training gym open floor cable equipment |
| `group-class` | `group-class.jpg` | 4:3 | 1600 × 1200 | small group fitness class coach training premium gym |
| `recovery` | `recovery.jpg` | 4:3 | 1600 × 1200 | gym recovery stretching calm wellness space |
| `personal-training` | `personal-training.jpg` | 4:3 | 1600 × 1200 | personal trainer coaching member strength training gym |
| `trainer-1` | `trainer-1.jpg` | 4:5 | 1200 × 1500 | strength coach portrait gym editorial natural light |
| `trainer-2` | `trainer-2.jpg` | 4:5 | 1200 × 1500 | female personal trainer portrait premium gym editorial |
| `trainer-3` | `trainer-3.jpg` | 4:5 | 1200 × 1500 | athletic coach portrait modern gym editorial photography |
| `community` | `community.jpg` | 4:3 | 1600 × 1200 | diverse gym members training together community premium gym |
| `nutrition` | `nutrition.jpg` | 4:3 | 1600 × 1200 | balanced athlete meal natural light nutrition editorial |
| `cta` | `cta.jpg` | 16:7 | 2400 × 1050 | athlete after workout premium gym dramatic wide cinematic |

Keep the subject or face near the manifest's `objectPosition` focal point; the site uses cover crops at multiple viewport sizes. Prefer original, properly licensed images and export compressed WebP or JPEG files while preserving the documented names (update the manifest if choosing another extension).

## Installed photo sources

| Local files | Pexels source |
| --- | --- |
| `hero.jpg` | [Modern well-equipped gym interior](https://www.pexels.com/photo/modern-well-equipped-gym-with-diverse-fitness-equipment-29526371/) |
| `free-weights.jpg` | [Dumbbells and weights](https://www.pexels.com/photo/black-and-red-dumbbells-on-brown-wooden-floor-3916766/) |
| `machines.jpg` | [Gym equipment interior](https://www.pexels.com/photo/gym-equipment-inside-the-fitness-gym-9545914/) |
| `cardio.jpg` | [Treadmills at gym](https://www.pexels.com/photo/treadmills-at-gym-12250460/) |
| `functional.jpg` | [Strength training machine detail](https://www.pexels.com/photo/close-up-of-gym-equipment-6050745/) |
| `group-class.jpg` | [Group CrossFit class](https://www.pexels.com/photo/a-group-of-people-doing-crossfit-in-a-gym-27433192/) |
| `recovery.jpg` | [Group stretching](https://www.pexels.com/photo/diverse-group-in-gym-performing-floor-stretches-39214328/) |
| `personal-training.jpg` | [Woman training on gym equipment](https://www.pexels.com/photo/woman-using-an-exercise-equipment-3931301/) |
| `community.jpg` | [Women exercising with dumbbells](https://www.pexels.com/photo/women-having-exercise-using-dumbbells-903171/) |
| `cta.jpg` | [Focused gym workout](https://www.pexels.com/photo/man-in-white-tank-top-holding-exercise-equipment-3888405/) |

An optional muted loop may be placed at `apps/web/public/video/hero.mp4`. Keep it short and efficiently encoded. It is not rendered when reduced motion is requested or the browser reports data saving; the hero image remains the poster and static fallback.

Slots without a supplied local file show a designed gradient-and-grain placeholder. Slot identifiers are shown on those placeholders only in development.
