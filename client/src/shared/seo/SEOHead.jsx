import { Helmet } from "react-helmet-async";

const SEOHead = ({
  title = "DevQuest - Interactive Coding Education Platform",
  description = "Master coding with DevQuest's interactive platform. Learn Python, JavaScript, Java, C++ and more through hands-on exercises, real-time feedback, and gamified learning paths.",
  keywords = "coding education, programming courses, learn to code, Python, JavaScript, Java, C++, interactive coding, programming tutorial, coding platform, developer education",
  canonical = "",
  image = "https://www.dev-quest.me/websiteicon.ico",
  type = "website",
  structuredData = null,
}) => {
  const baseUrl = "https://www.dev-quest.me";
  const fullUrl = canonical ? `${baseUrl}${canonical}` : baseUrl;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={fullUrl} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="DevQuest" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      )}
    </Helmet>
  );
};

export default SEOHead;
