# Database audit fields: created_at, updated_at, created_by, updated_by

> When to add created_at, updated_at, deleted_at, created_by, and updated_by columns, and whether user audit fields need foreign keys.

- Author: Dipkumar Patel
- URL: https://dipkumar.dev/posts/essential-db-design-1/
- Published: 2024-04-17
- Updated: 2026-06-17
- Tags: database, db, design

---

# Essential Fields

Be it relational or not, every table **should** have these 5 fields:

1. created_at (default now())
2. updated_at (default now())
3. deleted_at (default null)
4. created_by (not null)
5. updated_by (not null)

> Just to be clear, every table should have these 5 fields and not must. Adding these fields have other side-effects such as bloat, performance and disk size. But, if you're having these problems, i hope you're profitable. 

## Why should you include this fields ?

### Auditability

Incorporating these fields into every table significantly simplifies the auditing process. They enable you to track who created or modified an entry and when these actions occurred. It's important to note that while this doesn't provide a complete audit trail, not all tables require exhaustive audit trails. These fields deliver sufficient oversight for many applications.

### Soft Delete Capability

Utilizing the `deleted_at` field for soft deletions boosts data recovery and error correction capabilities, enabling businesses to effortlessly restore mistakenly deleted data or perform historical data analysis without relying on intricate backup systems. Additionally, you can set up a cron job to transfer data to an archive table periodically. For instance, you might move all data marked as deleted over three months ago to cold storage. This strategy helps maintain manageable table sizes by systematically archiving older records.

### Row Level Security/Permissions (RLS)

These fields might seem superfluous at first, but they are incredibly useful for controlling user access to specific rows within a table. For instance, you may want to prevent a user from updating a row that was created by someone else. By using these fields, you can define such permissions clearly and effectively. Furthermore, they enable more nuanced scenarios—for example, allowing a user to restore a deleted row only if they were the original creator, while still permitting any user to delete a row. This level of detailed control ensures both data integrity and adherence to specified access protocols.


### Avoiding Nightmares: A Cautionary Tale

Imagine you've deployed a cron job in the background designed to update certain attributes in your table based on specific business logic. It ran flawlessly during the staging tests, so you pushed it to production without further validation. But then, disaster strikes: the script modifies incorrect data. Fortunately, the updated_at and updated_by fields can come to your rescue (though not always). To identify the affected data, you can execute a query like:

```sql
SELECT * FROM items WHERE updated_at BETWEEN {script_begin} AND {script_end} AND updated_by = {script_user};
```

This allows you to pinpoint the exact entries altered during the time the script ran, providing a straightforward way to assess and rectify the unintended changes. This is a prime example of how such fields can help mitigate potential disasters, helping you manage crises more effectively.



## ORM: Django

if you're using some framework for accessing db like ORM in your codebase, it becomes easier to add these fields to your tables and helper queries. For example, I am showcasing you how to add these fields in django (python).

### 1. Create mixin class 

```python
from django.db import models
from django.utils import timezone
from django.conf import settings

class AuditFieldsMixin(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="%(class)s_created_by", on_delete=models.SET_NULL, null=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="%(class)s_updated_by", on_delete=models.SET_NULL, null=True)

    class Meta:
        abstract = True

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save()

```
What’s going on here? We’re defining fields that automatically capture when and by whom a record was created or updated. Plus, we threw in a soft_delete method for good measure, so you can "delete" records without actually losing them.

#### Slap the Mixin on a Model
Using this mixin is as easy as pie. Just inherit from AuditFieldsMixin in your model:

```python
class Item(AuditFieldsMixin):
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=5, decimal_places=2)
    # Imagine there are other fields here too!
```

### 2. QuerySets That Ignore Deleted Stuff
You don't want your default queries pulling up deleted records, right? Let’s fix that by tweaking the model’s manager to ignore anything that’s been soft-deleted:

```python
class AuditQuerySet(models.QuerySet):
    def active(self):
        return self.filter(deleted_at__isnull=True)

    def deleted(self):
        return self.filter(deleted_at__isnull=False)

class AuditManager(models.Manager):
    def get_queryset(self):
        return AuditQuerySet(self.model, using=self._db).active()

class Item(AuditFieldsMixin):
    objects = AuditManager()
    all_objects = models.Manager()  # This lets you access ALL records, even the "deleted" ones
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=5, decimal_places=2)
    # More fields, potentially
```


## Conclusion

Why do you need conclusion ? This is ain't generated by GPT. I am just a human being trying to help you.


If you have any past expirences of getting saved by some random fields, please let me know. I would be happy to learn. 

Send me an email at `pate@` + `dipkumar.dev`
