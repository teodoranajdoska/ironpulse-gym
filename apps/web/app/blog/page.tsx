import Image from 'next/image';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { EmptyState } from '@/components/ui/empty-state';
import { blogCategories, blogPosts } from '@/lib/blog-content';

export async function generateMetadata() {
  const t = await getTranslations('blog');
  return { title: t('pageTitle') };
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}): Promise<JSX.Element> {
  const t = await getTranslations('blog');
  const locale = await getLocale();
  const selectedCategory = searchParams?.category ?? 'all';
  const posts =
    selectedCategory === 'all'
      ? blogPosts
      : blogPosts.filter((post) => post.category === selectedCategory);
  const selectedCategoryLabel = blogCategories.find(({ id }) => id === selectedCategory);
  const formatDate = (date: string): string =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(`${date}T12:00:00`));

  return (
    <main className="page-width min-h-[70vh] py-16 sm:py-24">
      <header className="mx-auto max-w-3xl">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="display-font mt-3 text-5xl font-bold tracking-tightest text-foreground sm:text-7xl">
          {t('title')}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted">{t('description')}</p>
        <p className="mt-5 inline-flex rounded-full border border-brand-lime/40 bg-brand-lime/[0.08] px-4 py-2 text-xs font-semibold text-foreground">
          {t('fallbackNotice')}
        </p>
      </header>

      <nav aria-label={t('filterLabel')} className="mt-10 flex flex-wrap gap-2">
        <Link
          aria-current={selectedCategory === 'all' ? 'page' : undefined}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime ${
            selectedCategory === 'all'
              ? 'border-brand-lime bg-brand-lime text-brand-950'
              : 'border-line bg-surface text-foreground hover:border-brand-lime/60'
          }`}
          href="/blog"
        >
          {t('allCategories')}
        </Link>
        {blogCategories.map((category) => (
          <Link
            aria-current={selectedCategory === category.id ? 'page' : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime ${
              selectedCategory === category.id
                ? 'border-brand-lime bg-brand-lime text-brand-950'
                : 'border-line bg-surface text-foreground hover:border-brand-lime/60'
            }`}
            href={`/blog?category=${encodeURIComponent(category.id)}`}
            key={category.id}
          >
            {t(category.labelKey)}
          </Link>
        ))}
      </nav>

      {posts.length === 0 ? (
        <EmptyState
          className="mt-8"
          description={selectedCategoryLabel ? t('categoryEmpty') : t('noPosts')}
          title={selectedCategoryLabel ? t('categoryEmptyTitle') : t('noPostsTitle')}
        />
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const category = blogCategories.find(({ id }) => id === post.category);
            if (!category) return null;
            return (
              <article
                className="overflow-hidden rounded-panel border border-line bg-surface"
                key={post.slug}
              >
                <Link
                  aria-label={`${t(post.titleKey)} — ${t('readArticle')}`}
                  className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-lime"
                  href={`/blog/${post.slug}`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-raised">
                    <Image
                      alt=""
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      src={post.image}
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-wide text-muted">
                      <span className="text-brand-lime">{t(category.labelKey)}</span>
                      <time dateTime={post.date}>{formatDate(post.date)}</time>
                    </div>
                    <h2 className="display-font mt-3 text-2xl font-semibold text-foreground group-hover:text-brand-lime">
                      {t(post.titleKey)}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{t(post.excerptKey)}</p>
                    <span className="mt-5 inline-flex items-center text-sm font-semibold text-foreground">
                      {t('readArticle')}{' '}
                      <span aria-hidden="true" className="ml-2">
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
