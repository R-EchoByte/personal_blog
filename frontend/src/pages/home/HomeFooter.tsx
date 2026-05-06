type HomeFooterProps = {
  copyright: string;
  icp: string;
};

export function HomeFooter({ copyright, icp }: HomeFooterProps) {
  return (
    <footer className="landing-footer">
      <span className="footer-label">{copyright}</span>
      <span className="footer-divider" aria-hidden="true">
        ·
      </span>
      <span className="footer-icp">{icp}</span>
    </footer>
  );
}
