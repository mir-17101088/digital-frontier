Inside Bangladesh’s Cyberspace: complete static website

Serve this directory as the web root. Open index.html through a local HTTP server.
From the parent folder, run: npm run dev
Local preview: http://localhost:4173

12 pages, self-hosted fonts and icons, no runtime CDN or application server.
robots.txt, sitemap.xml, llms.txt and site.webmanifest sit beside the pages. Their URLs, the canonical
links and the share card use SITE_URL in ../tools/build.py (see ../BUILD-NOTES.md, Revision 14).
All reading content and navigation work without JavaScript.
