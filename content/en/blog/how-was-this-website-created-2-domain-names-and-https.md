+++
date = 2020-08-28T01:00:59Z
summary = "The second installment in the series of blog posts, that  describe the way this website was created. In this post I analyze custom domain names, DNS and HTTPS."
tags = ["HTTPS", "DNS", "tutorial", "web-development", "Cloudflare", "Github Pages"]
title = "How was this website created (2) - Domain Names and HTTPS"

+++
#### This is the second installment in the series of blog posts, that  describe the way this website was created. In this post I analyze custom domain names, DNS and HTTPS certificates. You can find the first part <a href='../how-was-this-website-created-1-cms-vs-ssg/' title='How was this website created (1) - CMS vs SSG'>here</a>.

## What we have so far

In the previous part, we created a static website using Hugo and hosted it using Github Pages. When using the latter, you can access the published website using a URL in the form of your-github-username.github.io. For example, this website's Github Pages URL is [ChrisKar96.github.io](https://ChrisKar96.github.io). This is enough for websites that showcase a project and share documentation about it, but a personal website needs a more professional and easy to type and remember URL. So, our next mission is to acquire a custom domain name to use for accessing our website.

## Domain Names and TLDs

[As Wikipedia states](https://en.wikipedia.org/wiki/URL "URL Wiki"),

> A typical URL could have the form [http://www.example.com/index.html](http://www.example.com/index.html "http://www.example.com/index.html"), which indicates a protocol (`http`), a [hostname](https://en.wikipedia.org/wiki/Hostname "Hostname Wiki") (`www.example.com`), and a file name (`index.html`).

The _protocol_, when talking about browsing web pages, can either be plain HTTP, or the secure alternative HTTPS. We will elaborate further on that, later in this post.

The _file name_, in our case, points to the HTML files we generated via our SSG, that hold the contents of the web page.

Finally, the _hostname_, can be broken further down in three parts separated by a dot.

* Before the first dot we have the _subdomain_. The most popular subdomain is 'www', standing for world-wide-web.
* Between the first two dots we have the main _domain_. This is the name registered by a [Domain Name System](https://en.wikipedia.org/wiki/Domain_Name_System "Domain Name System Wiki") (DNS) authority and must follow it's rules.
* After the second dot, we have the [top-level domain](https://en.wikipedia.org/wiki/Top-level_domain) (TLD). This is paired with the domain in the DNS registration, and is used together to point to the correct network location. This way, [example.com](example.com) and [example.org](example.org) can be owned by different people and pointing to different locations.

_To use a domain name you must first purchase it from a domain name registrar._

### But why do domain names cost money?

If Facebook and Instagram let you create blog-like pages for free, why does owning a personal domain name cost money? The answer to the above question is not obvious at first, but becomes clear once you think about it a little more carefully. The servers and network devices that run and resolve domain names, from the root servers to the end DNS servers on the Internet, all of them cost money to buy, maintain and keep running. _Buying a domain name is required to cover the cost of the hardware, the energy to power it and the salaries of the people who maintain it._ It is not the actual name that you are charged for, but for using the infrastructure that allows you to use it. (This is, of course, an oversimplification, but it's not in the scope of this post to explain the many more reasons as to why domain names cost money.)

Furthermore, many hosting providers have bundled the purchase of a domain name with a hosting package. It actually makes sense if you think about it: the overwhelming majority will not use private dedicated servers to host a website - they are going to need hosting anyway! So, the hosting providers capitalize on that by buying the domain names in bulk from the registrars and then advertise their hosting packages as including a free domain. In fact, the price of the package is calculated and adjusted to include the cost of the domain, as well as the cost of using the control panel that the hosting provider created for you to use and manage your purchased services.

### Do free domains exist?

We covered above why domain names need to be paid for and one option to get a free domain, which is by purchasing a hosting plan. Is this your only choice for a free domain though? Luckily no! There are some TLDs that you can use free of charge, offered by [Freenom](https://www.freenom.com "Freenom - A Name For Everyone"). Amsterdam-based OpenTLD, operating under the Freenom brand, lets you register .tk, .ml, .ga, .cf and .gq domains without even submitting any billing information. Some rules apply, of course, and not everything is free, but you can learn more about these [here](https://www.freenom.com/en/freeandpaiddomains.html "Freenom Free And Paid Domains"). A question that arises though! If domain names need to be paid for how can Freenom afford to give them for free? To answer that, let's see where those TLDs come from:

| TLD | Corresponding country or territory |
| --- | --- |
| .tk | Tokelau consists of three coral islands in the Pacific Ocean. Even though its population is approximately 1500 people, according to a 2016 analysis .tk domains are the “world’s largest country-code domain - almost as large as second and third place holders China (.cn) and Germany (.de) combined”. Registrations of .tk domains have increased its GDP by more than 10%. |
| .ml | Mali is a landlocked country in North-West Africa with a 10% rate of Internet use among its entire 20 million population. |
| .ga | Gabon is a small nation on the western coast of Africa, with a population of 2.1 million, about a third of which lives in poverty. |
| .cf | Central African Republic is a country where only 4% of inhabitants have regular access to the Internet. |
| .gq | Equatorial Guinea is a tiny African country where the government accumulates all the profits from exploiting its rich oil reserves. |

The pattern that emerges is pretty clear. Each of those countries has very low demand for local domain names, be it for political or economical reasons, or even just because they are so sparsely populated that they have no use for them. So, Freenom has partnered directly with those countries and their governments, to provide the domain names for their local TLDs free of charge to everyone, including their residents, so that it helps them engage in online activities.

#### Registering a free domain name at Freenom

Registrations can be either free, in which case the user owns only usage rights and not the domain itself, or paid, which grants full rights. Free domains are pointed to Freenom name servers, which redirect the domain via HTML frames to a specified address or to a specified A or NS record, and support the redirection of up to 250 email addresses to an external address.

![Freenom Domain Registration](/uploads/freenom_registration.png "Freenom Domain Registration")

After registering a domain, we can see it at the "My Domains" sub-menu of "Services", at our Freenom account. Freenom doesn't offer a control panel with many features to manage our domains, so if we want to make the most out of our domain (and we do!), we need to manage it through a different service.

## Managing domain DNS through Cloudflare

**Cloudflare** is a web-infrastructure and website-security company, providing [content-delivery-network](https://en.wikipedia.org/wiki/Content_delivery_network "Content delivery network") services, [DDoS mitigation](https://en.wikipedia.org/wiki/DDoS_mitigation "DDoS mitigation"), [Internet security](https://en.wikipedia.org/wiki/Internet_security "Internet security"), and distributed [domain-name-server](https://en.wikipedia.org/wiki/Domain_name_server "Domain name server") services.

The instructions of registering a free account at Cloudflare and registering your domain can be found [here](https://support.cloudflare.com/hc/en-us/articles/201720164-Creating-a-Cloudflare-account-and-adding-a-website "Creating a Cloudflare account and adding a website"). All you have to do after creating your account, is to replace Freenom's nameservers with the ones that Cloudflare will assign to your domain, at it's control panel in Freenom's website.

After successfully registering your domain, you will be granted access in a control panel, much richer in features than the one Freenom offers. You can see below some of the options I have chosen and the reasoning behind them.

### DNS

I added the 4 A records Github Pages needs for a custom domain (more on that later). These are the 4 IP addresses that need to be pointed at, from the root of your domain.

    185.199.108.153
    185.199.109.153
    185.199.110.153
    185.199.111.153

I also added a _www_ CNAME record to point at the root of the domain.

### SSL/TLS

The simple way to have https connections, is to enable the 'Full' SSL/TLS encryption mode. 'Full (Strict)' mode is more of a hassle to set up on Github Pages and I can see no real advantage for the extra work. 

In the "Edge Certificates" sub-menu I have the following options selected:

* Always Use HTTPS - ON
* Minimum TLS Version - 1.2 (Previous TLS versions, as well as SSL versions, have security vulnerabilities. At the cost of some older clients being unable to connect, this is the best compromise between security and accessibility.)
* Opportunistic Encryption - ON
* TLS 1.3 - ON
* Automatic HTTPS Rewrites - ON

### Speed

In the 'Optimization' sub-menu:

* Auto Minify - All Checked (Be careful when minifing CSS and JS files, if you included their hash in the 'integrity' html attribute, this could make them unable to load.)
* Brotli - ON
* Rocket Loader - ON

### Caching

In the 'Configuration' sub-menu:

* Caching Level - Standard
* Browser Cache TTL - 1 year
* Always Online - ON

### Network

* HTTP/2 - ON
* HTTP/3 (with QUIC) - ON
* 0-RTT Connection Resumption - ON
* IPv6 Compatibility - ON
* WebSockets - ON
* Onion Routing - ON

### Scrape Shield

* Email Address Obfuscation - ON
* Server-side Excludes - ON

It is clear that cloudflare offers many useful features, even to the free users, and configuring the ones you want is as easy as flipping an ON/OFF switch. 

## Custom Domain Name for Github Pages

You can find more about setting up a custom domain name for Github Pages [here](https://help.github.com/en/github/working-with-github-pages/configuring-a-custom-domain-for-your-github-pages-site "Configuring a custom domain for your GitHub Pages site").

In a nutshell, you need to go to the repository settings and add the custom domain you want eg. "[www.christoskaramo.tk](https://www.christoskaramo.tk)" at the corresponding form field, in the Github Pages section, after you added the previously mentioned A records in your DNS configuration.

## Summing up

We talked about domain names, how can we get one for free and the reasons that allow it. We also talked about setting up a Cloudflare account to manage our domain name and make it point to our Github Pages. If you followed the steps, you should have a domain name pointing at your webpage through HTTPS. Congrats!

#### Join me at the next part, where we speak about emails.