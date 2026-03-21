import { Link } from "react-router-dom";

type FeaturePendingPageProps = {
  title: string;
};

export default function FeaturePendingPage({ title }: FeaturePendingPageProps) {
  return (
    <section
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h2 style={{ margin: "0 0 12px" }}>{title}</h2>
        <p style={{ margin: "0 0 16px" }}>功能未实现</p>
        <Link to="/">返回首页</Link>
      </div>
    </section>
  );
}
