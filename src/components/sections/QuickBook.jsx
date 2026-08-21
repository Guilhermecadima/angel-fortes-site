export default function QuickBook({ onBook }) {
  return (
    <section className="quick-book">
      <div>
        <p className="eyebrow dark">Sem chamadas. Sem esperas.</p>
        <h2>Marca em menos de um minuto.</h2>
      </div>
      <button className="btn btn-dark" onClick={() => onBook()}>
        Escolher horário →
      </button>
    </section>
  );
}
