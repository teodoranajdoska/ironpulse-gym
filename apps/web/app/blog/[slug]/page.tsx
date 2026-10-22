import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { blogCategories, blogPosts } from '@/lib/blog-content';

export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string }> {
  return blogPosts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = blogPosts.find(({ slug }) => slug === params.slug);
  if (!post) return {};
  const t = await getTranslations('blog');
  return { title: `${t(post.titleKey)} | IronPulse` };
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const post = blogPosts.find(({ slug }) => slug === params.slug);
  if (!post) notFound();
  const t = await getTranslations('blog');
  const locale = await getLocale();
  const category = blogCategories.find(({ id }) => id === post.category);
  if (!category) notFound();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(
    new Date(`${post.date}T12:00:00`),
  );

  return (
    <main className="page-width min-h-[70vh] py-12 sm:py-20">
      <article className="mx-auto max-w-4xl">
        <Link className="text-link" href="/blog">
          {t('backToBlog')}
        </Link>
        <div className="mt-8">
          <p className="eyebrow">{t(category.labelKey)}</p>
          <h1 className="display-font mt-3 text-4xl font-bold tracking-tightest text-foreground sm:text-6xl">
            {t(post.titleKey)}
          </h1>
          <time className="mt-4 block text-sm text-muted" dateTime={post.date}>
            {date}
          </time>
        </div>
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-panel bg-raised">
          <Image
            alt={t(post.titleKey)}
            className="object-cover"
            fill
            priority
            sizes="(max-width: 896px) 100vw, 896px"
            src={post.image}
          />
        </div>
        <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-8 text-muted sm:text-lg">
          {post.contentKeys.map((key) => (
            <p key={key}>{t(key)}</p>
          ))}
        </div>
        <Link className="text-link mt-10" href="/blog">
          {t('backToBlog')}
        </Link>
      </article>
    </main>
  );
}
