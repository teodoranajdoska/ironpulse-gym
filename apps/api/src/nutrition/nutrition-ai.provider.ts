import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NutritionQuestionnaireInput } from '@ironpulse/shared';
import { Env } from '../config/env';

export type NutritionTargets = {
  bmr: number;
  tdee: number;
  targetCalories: number;
  macros: { calories: number; proteinG: number; carbsG: number; fatG: number };
};

export type NutritionGenerationContext = {
  questionnaire: NutritionQuestionnaireInput;
  targets: NutritionTargets;
};

export interface AiProvider {
  generate(
    context: NutritionGenerationContext,
    validationFeedback?: string,
  ): Promise<string>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
export const FALLBACK_PROVIDER = Symbol('FALLBACK_PROVIDER');

type MealOption = {
  name: string;
  ingredients: string[];
  instructions: string[];
};

const MEALS: Record<NutritionQuestionnaireInput['dietType'], MealOption[]> = {
  omnivore: [
    {
      name: 'Chicken and brown rice bowl',
      ingredients: ['chicken breast', 'brown rice', 'spinach', 'olive oil'],
      instructions: ['Cook the chicken thoroughly.', 'Serve with rice and spinach.'],
    },
    {
      name: 'Lentil and roasted vegetable bowl',
      ingredients: ['lentils', 'carrot', 'zucchini', 'olive oil'],
      instructions: ['Cook the lentils until tender.', 'Roast the vegetables and combine.'],
    },
    {
      name: 'Baked salmon with potatoes',
      ingredients: ['salmon', 'potatoes', 'green beans', 'lemon'],
      instructions: ['Bake the salmon until fully cooked.', 'Serve with potatoes and beans.'],
    },
    {
      name: 'Egg and quinoa plate',
      ingredients: ['eggs', 'quinoa', 'tomato', 'cucumber'],
      instructions: ['Cook the quinoa.', 'Cook the eggs and serve with fresh vegetables.'],
    },
  ],
  vegetarian: [
    {
      name: 'Greek yogurt and oat bowl',
      ingredients: ['Greek yogurt', 'oats', 'berries', 'chia seeds'],
      instructions: ['Combine the ingredients in a bowl.', 'Serve chilled or prepare overnight.'],
    },
    {
      name: 'Lentil and roasted vegetable bowl',
      ingredients: ['lentils', 'carrot', 'zucchini', 'olive oil'],
      instructions: ['Cook the lentils until tender.', 'Roast the vegetables and combine.'],
    },
    {
      name: 'Egg and quinoa plate',
      ingredients: ['eggs', 'quinoa', 'tomato', 'cucumber'],
      instructions: ['Cook the quinoa.', 'Cook the eggs and serve with fresh vegetables.'],
    },
    {
      name: 'Bean and brown rice bowl',
      ingredients: ['black beans', 'brown rice', 'corn', 'avocado'],
      instructions: ['Cook the rice and beans.', 'Serve with corn and sliced avocado.'],
    },
  ],
  vegan: [
    {
      name: 'Overnight oat and berry bowl',
      ingredients: ['oats', 'berries', 'chia seeds', 'oat drink'],
      instructions: ['Combine the ingredients and refrigerate overnight.', 'Stir before serving.'],
    },
    {
      name: 'Lentil and roasted vegetable bowl',
      ingredients: ['lentils', 'carrot', 'zucchini', 'olive oil'],
      instructions: ['Cook the lentils until tender.', 'Roast the vegetables and combine.'],
    },
    {
      name: 'Tofu and brown rice bowl',
      ingredients: ['tofu', 'brown rice', 'broccoli', 'sesame oil'],
      instructions: ['Cook the rice.', 'Pan-sear the tofu and broccoli, then serve together.'],
    },
    {
      name: 'Chickpea and quinoa plate',
      ingredients: ['chickpeas', 'quinoa', 'tomato', 'cucumber'],
      instructions: ['Cook the quinoa and chickpeas.', 'Serve with chopped vegetables.'],
    },
  ],
  halal: [
    {
      name: 'Chicken and brown rice bowl',
      ingredients: ['halal chicken breast', 'brown rice', 'spinach', 'olive oil'],
      instructions: ['Cook the halal chicken thoroughly.', 'Serve with rice and spinach.'],
    },
    {
      name: 'Lentil and roasted vegetable bowl',
      ingredients: ['lentils', 'carrot', 'zucchini', 'olive oil'],
      instructions: ['Cook the lentils until tender.', 'Roast the vegetables and combine.'],
    },
    {
      name: 'Baked salmon with potatoes',
      ingredients: ['salmon', 'potatoes', 'green beans', 'lemon'],
      instructions: ['Bake the salmon until fully cooked.', 'Serve with potatoes and beans.'],
    },
    {
      name: 'Chickpea and quinoa plate',
      ingredients: ['chickpeas', 'quinoa', 'tomato', 'cucumber'],
      instructions: ['Cook the quinoa and chickpeas.', 'Serve with chopped vegetables.'],
    },
  ],
};

const SAFE_STAPLES = [
  'rice',
  'potato',
  'sweet potato',
  'broccoli',
  'spinach',
  'carrot',
  'zucchini',
  'tomato',
  'cucumber',
  'olive oil',
  'quinoa',
];

function blockedFoodTerms(context: NutritionGenerationContext): string[] {
  const terms = [
    ...context.questionnaire.allergies,
    ...context.questionnaire.dislikedFoods,
  ].map((term) => term.trim().toLowerCase());
  const aliases: Record<string, string[]> = {
    dairy: ['milk', 'yogurt', 'cheese', 'butter', 'cream'],
    milk: ['yogurt', 'cheese', 'butter', 'cream'],
    gluten: ['wheat', 'bread', 'pasta', 'oats', 'barley'],
    wheat: ['bread', 'pasta'],
    nuts: ['peanut', 'almond', 'walnut', 'cashew', 'hazelnut'],
    'tree nuts': ['almond', 'walnut', 'cashew', 'hazelnut'],
    legumes: ['lentil', 'black bean', 'chickpea', 'soy', 'tofu'],
    soy: ['tofu', 'soy'],
    sesame: ['sesame oil', 'sesame seeds'],
    fish: ['salmon', 'tuna'],
    shellfish: ['shrimp', 'prawn', 'crab', 'lobster'],
  };
  return terms.flatMap((term) => [term, ...(aliases[term] ?? [])]);
}

@Injectable()
export class FallbackNutritionProvider implements AiProvider {
  async generate(context: NutritionGenerationContext): Promise<string> {
    const blocked = blockedFoodTerms(context);
    const options = MEALS[context.questionnaire.dietType].filter((meal) =>
      [...meal.ingredients, meal.name].every(
        (food) => !blocked.some((term) => food.toLowerCase().includes(term)),
      ),
    );
    if (!options.length) {
      const ingredients = SAFE_STAPLES.filter((food) =>
        blocked.every((term) => !food.toLowerCase().includes(term)),
      );
      if (!ingredients.length) {
        throw new InternalServerErrorException(
          'A safe fallback meal plan could not be generated from the supplied restrictions.',
        );
      }
      options.push({
        name: 'Simple meal with selected safe ingredients',
        ingredients: ingredients.slice(0, 4),
        instructions: ['Prepare the selected ingredients without adding restricted foods.'],
      });
    }

    const { mealsPerDay } = context.questionnaire;
    const { macros } = context.targets;
    const days = Array.from({ length: 7 }, (_, dayIndex) => ({
      day: dayIndex + 1,
      meals: Array.from({ length: mealsPerDay }, (_, mealIndex) => {
        const option = options[(dayIndex + mealIndex) % options.length];
        const share = (value: number) =>
          Math.round(
            mealIndex === mealsPerDay - 1
              ? value * mealsPerDay -
                  Math.round((value * mealsPerDay) / mealsPerDay) * (mealsPerDay - 1)
              : value,
          );
        return {
          ...option,
          calories: share(macros.calories / mealsPerDay),
          proteinG: share(macros.proteinG / mealsPerDay),
          carbsG: share(macros.carbsG / mealsPerDay),
          fatG: share(macros.fatG / mealsPerDay),
        };
      }),
    }));
    return JSON.stringify({ days });
  }
}

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

@Injectable()
export class AnthropicNutritionProvider implements AiProvider {
  constructor(
    private readonly config: ConfigService<Env, true>,
  ) {}

  async generate(
    context: NutritionGenerationContext,
    validationFeedback?: string,
  ): Promise<string> {
    const apiKey = this.config.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('Anthropic API key is not configured.');
    }
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.get('ANTHROPIC_MODEL'),
        max_tokens: 6000,
        system:
          'Create a practical seven-day meal plan. Respect every allergy, disliked food, diet type, calorie target, and macro target. Halal means no pork or alcohol. Return only valid JSON matching {"days":[{"day":1,"meals":[{"name":"...","ingredients":["..."],"instructions":["..."],"calories":0,"proteinG":0,"carbsG":0,"fatG":0}]}]} with seven days and the requested number of meals per day. Do not add markdown or prose.',
        messages: [
          {
            role: 'user',
            content: JSON.stringify({ ...context, validationFeedback }),
          },
        ],
      }),
    });
    if (!response.ok) {
      throw new InternalServerErrorException(
        `Nutrition provider request failed with status ${response.status}.`,
      );
    }
    const payload = (await response.json()) as AnthropicResponse;
    const text = payload.content?.find((item) => item.type === 'text')?.text;
    if (!text) {
      throw new InternalServerErrorException('Nutrition provider returned an empty response.');
    }
    return text;
  }
}
