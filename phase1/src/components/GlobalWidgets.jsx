import NoticeBell from './NoticeBell';
import SuggestionBox from './SuggestionBox';
import GlobalChat from './GlobalChat';

export default function GlobalWidgets({ user }) {
  return (
    <>
      <div className="global-widgets-top-right">
        <NoticeBell />
        <SuggestionBox />
      </div>
      <GlobalChat currentUserId={user?.id} />
    </>
  );
}
