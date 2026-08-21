import image from '../../assets/images/about-img-2.jpg';

export default function Experience() {
  return (
    <section className="experience" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.52),rgba(0,0,0,.52)), url(${image})` }}>
      <div className="experience-card">
        <p className="eyebrow dark">A experiência</p>
        <h2>Chegas. Sentes-te em casa. Sais melhor.</h2>
        <div className="experience-points">
          <div><span>01</span><p>Escolhe o serviço e um horário disponível.</p></div>
          <div><span>02</span><p>Recebe a confirmação da tua marcação.</p></div>
          <div><span>03</span><p>Aparece, senta-te e deixa o resto connosco.</p></div>
        </div>
      </div>
    </section>
  );
}
