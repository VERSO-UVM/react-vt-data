# Data Blog: How to Publish a Post

Posts live at `/resources/data-blog/<slug>`. Each post is one entry in
`blogs.tsx`, plus a folder at `content/<slug>/`.

## For writers

**You send the dev team:**

1. **`content.docx`**: copy `content/_template/content.docx` and fill it in.
   Fill in the "Post Details" table at the top too (title, summary, author,
   tags, source). The dev team deletes the table before publishing.
2. **Charts**: Specify exactly which interactive data visualizations you would like to include, and mark where in the `content.docx` file. 

**Writing rules:**

- Use Word's built-in **Heading** styles for section headings. Bold text is
  not a heading.
- Put each chart on its own line as `[chart:chart-1]`, `[chart:chart-2]`, and
  so on. Write nothing else on that line.
- Links, lists, bold, and italics carry over. Images, text boxes, and custom
  fonts do not.

## For devs

1. Create `content/<slug>/` and save the writer's `content.docx` in it, with
   the Post Details table deleted.
2. If the post has charts, add `content/<slug>/charts.json`. Each key matches
   a `[chart:<id>]` in the docx. The shape is `BlogChartSpec` in
   `[slug]/BlogChart.tsx`:

   ```json
   {
     "chart-1": {
       "type": "bar",
       "title": "Uninsured rate by county",
       "source": "Census ACS-5, 2023",
       "x": "county",
       "unit": "%",
       "series": [{ "key": "uninsured", "label": "Uninsured" }],
       "data": [{ "county": "Addison", "uninsured": 3.9 }]
     }
   }
   ```

3. Add an entry to `BLOGS` in `blogs.tsx`, with a matching `slug`. `author` is
   a member of `TEAM` from `app/about/team/team.ts`.
4. Set `published: true`. Run `npm run dev` and check the post at
   `/resources/data-blog/<slug>`.
5. Run `npm run build` before you merge. The build fails if a `[chart:id]` has
   no entry in `charts.json` or if `charts.json` is invalid JSON.
