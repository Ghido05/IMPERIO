import ClassificaGenerale_Board from '../ClassificaGenerale_Board';
import ScaledPreview from '../components/ScaledPreview';
import { ScoreProvider } from '../context/ScoreContext';

export default function ScoresView() {
  return (
    <ScoreProvider>
      <div className="fixed inset-0 overflow-hidden bg-black">
        <ScaledPreview interactive mode="fit">
          <ClassificaGenerale_Board />
        </ScaledPreview>
      </div>
    </ScoreProvider>
  );
}
