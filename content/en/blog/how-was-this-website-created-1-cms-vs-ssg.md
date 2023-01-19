+++
date = 2019-10-09T13:30:00Z
summary = "This is the first of a series of blog posts, that will describe the way this website was created. In this post I analyze various hosting options and the differences between CMS and SSG."
tags = ["hosting", "web-development", "tutorial", "SSG", "CMS"]
title = "How was this website created (1) - CMS vs SSG"

+++
#### _This is the first of a series of blog posts, that will describe the way this website was created. Let's get started!_

## The use case

I wanted to build a website to showcase my work, share my CV from and occasionally blog about things that interest me. As a student, my resources are limited, so I also wanted to do the best work possible, without having to pay for any service. So, the goal was to combine the best free services available, to create a personal website / blog.

## Hosting

So, the first thing you have to think about when you start building a website is "hosting". Where will the website be hosted? Usually, the answer to that question does not involve the word "free", which contradicts our use case. Most hosting options are payed, with monthly or yearly fees, and the cost is varied according to the provided services.

There are two options when it comes to hosting services.

### VPS Renting

The first option is called VPS renting, VPS standing for "Virtual Private Server". In essence, VPS renting means that you rent resources from the hosting service's server and those resources act as a virtual private server. The difference between this and a -much costlier- dedicated server, is that the VPS will never use all the resources of the server but it may use resources that belong to other VPS's when those are idle. To host a website in a VPS you have to install an OS image to it - provided by the hosting service, then set web, mail and database servers, upload the files and configure pretty much everything yourself. This is a good option for advanced users that usually want to do much more than hosting a simple website. The reason is that, while you can set everything up exactly the way you want, you have to do the monitoring yourself and fix any problems that may arise, since the hosting service will not support you.

### Shared Website Hosting

The second option is called "Shared Website Hosting". This is when you rent resources from a hosting service and you get a control panel to adjust the provided services. These services can be database management, domain control, mail management, backup configuration and probably even a website builder. It is recommended to most users since it is cheaper than VPS renting and it requires little-to-none IT skills and if you get stuck you can ask the host to help you with the configurations. However, it provides less configurability than a VPS, as well as worse performance, since all hosted sites share the same resources.

### GitHub Pages

None of the above options are usually free, and while there are some free website hosting services (like [000webhost](https://www.000webhost.com "000webhost")), they don't have the best reputation, so I had to look for other alternatives.

I decided to use [Github Pages](https://pages.github.com/ "Github Pages") since it is completely free, and supports both custom domain names and SSL certificates for HTTPS access. I could have used [Gitlab Pages](https://about.gitlab.com/product/pages/ "Gitlab Pages") too, but Github was more appropriate for me, since it's where I host all my public repositories anyway.

## CMS vs SSG

This brings us to the core point of the article. Github Pages and similar services only support static sites. Blogging and dynamic content in general, requires some kind of content management and traditional CMS (content management systems) like [Wordpress](https://wordpress.org/ "Wordpress") and [Drupal](https://www.drupal.org/ "Drupal") need server-side processing since they are written in [PHP](https://en.wikipedia.org/wiki/PHP "PHP Wiki") and need a database to store the content. With static HTML you can't really have that. This is where SSGs (static-site-generators) come into play.

### SSGs

Static site generators are used to create [JAMstack ](https://jamstack.org/ "JAMstack")sites. JAMstack sites are using only [**J**avascript](https://en.wikipedia.org/wiki/JavaScript "Javascript Wiki"), [**A**PIs ](https://en.wikipedia.org/wiki/Application_programming_interface "API Wiki")and [**M**arkup ](https://en.wikipedia.org/wiki/Markup_language "Markup Wiki")to provide the full user experience without having to use a web server. This is perfect for hosting at Github Pages and similar services where you can use only static webpages. To handle dynamic content (blog posts for example), files are created or modified and after the site is regenerated, the changes are reflected at static web pages. This way we create content dynamicly and publish it staticly.

![Static vs Dynamic Site Http Request Handling](https://about.gitlab.com/images/blogimages/ssg-gitlab-pages-series/part-1-dynamic-x-static-server.png "Static vs Dynamic Site Http Request Handling")

###### <center>_Image taken from_ [Gitlab](https://about.gitlab.com/blog/2016/06/03/ssg-overview-gitlab-pages-part-1-dynamic-x-static/%22 "https://about.gitlab.com/blog/2016/06/03/ssg-overview-gitlab-pages-part-1-dynamic-x-static/")_</center>_

### Pros and Cons of Static Site Generators

#### Pros

* **Loading Speed:** Since SSGs don’t require databases, there is no need for server-side processing. The HTTP request to the server can be handled immediately, as depicted above, without any delay for generating the page, like using PHP would, after querying a database for example.
* **Security:** Not having a database or any dynamic interpreter leaves fewer loose ends to exploit such as [SQL injections](https://en.wikipedia.org/wiki/SQL_injection "SQL Injection Wiki").
* **Flexibility:** The flexibility of SSGs is remarkable, since they distinguish between content management and content presentation. You can simply have a template in Markup and have all your content generated in that. Also, everything is on git, so you can easily track changes, create development branches for draft content and more.

#### Cons

* **No support for Dynamic Content:** Static site generators produce, well, static sites. So, by definition, server-side dynamic content is not supported. This is not much of a problem since client-side dynamic content can be created with custom Javascript or third-party solutions.
* **Ease of Use:** If you are not comfortable with coding, you’re going to have a bad time. A [headless or API-driven CMS](https://headlesscms.org/ "Find a headless CMS") might help manage your content more easily, with a [WYSIWYG](https://en.wikipedia.org/wiki/WYSIWYG "WYSIWYG") content editor, but it's highly unlikely that you will not have to write any code, because usually the UIs have limited capabilities.

### Choosing a Static Site Generator

You can find a very detailed comparison of most broadly used SSGs at [StaticGen](https://www.staticgen.com/ "StaticGen") and choose the one that fits your needs best. When searching for the ideal SSG for me, I firstly considered [Jekyll](https://jekyllrb.com/ "Jekyll"), which is the most widely used SSG to date. I ended up choosing [Hugo](https://gohugo.io/ "Hugo"), because of the [Introduction theme](https://themes.gohugo.io/hugo-theme-introduction/ "Introduction Hugo theme") that caught my eye and I am very pleased with my choice. Hugo is blazing fast at generating the site (they claim it takes about 1 millisecond per content page) , it's open-source with an active community and there are many [free themes](https://themes.gohugo.io/ "Hugo theme repository") for it, so it checks all my boxes.

## Summing up

Static Site Generators are the future of web development, because of how fast they are at prototyping and theming a website. When paired with a headless CMS, they become even better at managing dynamic content as statically published, fast loading and secure web pages, while keeping the overall complexity at a minimum .

This website is hosted in Github Pages and is generated by Hugo, using the Introduction theme.

#### _Join me at the_ [_next part_](../how-was-this-website-created-2-domain-names-and-https "How was this website created, part 2 - Domain Names and HTTPS")_, where we speak about custom domain names, DNS and HTTPS._