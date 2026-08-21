import mainPhoto from '../../assets/images/about-img-1.jpg';
import secondaryPhoto from '../../assets/images/about-img-2.jpg';

export default function About() {
  return (
    <section className="about section" id="sobre">
      <div className="section-copy">
        <p className="eyebrow dark">Quem somos</p>
        <h2>Uma barbearia feita para quem repara nos detalhes.</h2>
        <p>
          Na Angel Fortes, cada corte é adaptado ao cliente. Trabalhamos técnicas tradicionais e
          contemporâneas com o mesmo objetivo: sair da cadeira com um visual que encaixa contigo.
        </p>
        <p>
          Proximidade, consistência e atenção ao detalhe continuam no centro da experiência.
        </p>

        <div className="stats">
          <div><strong>9+</strong><span>Serviços</span></div>
          <div><strong>6 dias</strong><span>Por semana</span></div>
          <div><strong>1 objetivo</strong><span>Sair melhor</span></div>
        </div>
      </div>

      <div className="photo-stack">
        <img className="photo-main" src={mainPhoto} alt="Corte na Barbearia Angel Fortes" />
        <img className="photo-small" src={secondaryPhoto} alt="Barbearia Angel Fortes" />
      </div>
    </section>
  );
}
