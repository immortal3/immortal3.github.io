# Hugo commands

> A quick reference for common Hugo static site generator commands and workflows.

- Author: Dipkumar Patel
- URL: https://dipkumar.dev/posts/hugo-cmds/
- Published: 2021-11-28
- Updated: 2026-04-26
- Tags: hugo

---

### run local server
```
hugo server -D
```

### Create New Post
```
hugo new content/posts/{post-name}.md
```

### Hugo build/export the site

```
hugo -d ../becoming-the-unbeatable
```

### relative imports

example: static\icons\favicon.png \
relative imports: icons\favicon.png

### fix for label image

icon: small_icon.jpg
instead of 
icon: small_icon.png

github issue: https://github.com/adityatelange/hugo-PaperMod/issues/622
