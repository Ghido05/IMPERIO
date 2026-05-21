import ClassificaGenerale_Board from '../ClassificaGenerale_Board';
import { ScoreProvider } from '../context/ScoreContext';

export default function ScoresView() {
  return (
    <ScoreProvider>
      <div className="w-full h-screen overflow-hidden">
        <ClassificaGenerale_Board />
      </div>
    </ScoreProvider>
  );
}