from django.db import migrations, models


def copy_category_to_categories(apps, schema_editor):
    Article = apps.get_model('articles', 'Article')
    for article in Article.objects.exclude(category__isnull=True):
        article.categories.add(article.category)


class Migration(migrations.Migration):

    dependencies = [
        ('articles', '0003_article_cover_image'),
    ]

    operations = [
        # Free up related_name='articles' on the FK so M2M can use it
        migrations.AlterField(
            model_name='article',
            name='category',
            field=models.ForeignKey(
                'articles.Category',
                on_delete=models.PROTECT,
                related_name='fk_articles',
            ),
        ),
        # Add M2M with final related_name
        migrations.AddField(
            model_name='article',
            name='categories',
            field=models.ManyToManyField(
                to='articles.Category',
                related_name='articles',
                blank=True,
            ),
        ),
        # Copy existing single category into the M2M
        migrations.RunPython(copy_category_to_categories, migrations.RunPython.noop),
        # Remove old FK
        migrations.RemoveField(
            model_name='article',
            name='category',
        ),
    ]
