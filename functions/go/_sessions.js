/**
 * 研習現場短連結（/go/<代碼>）的每場資料。
 *
 * 每場學員不同，所以密碼是「每場各自一組」，不是全站共用一組密碼
 * （跟 functions/tools/_middleware.js 的 INTERNAL_TOOLS_PASSWORD 是兩回事）。
 * 密碼只是課堂口令，擋隨手分享外流，不是要防真的想破解的人，
 * 所以直接寫在這個檔案裡跟著進 repo，不用另外申請環境變數。
 *
 * 新增下一場：在下面加一組，同步在 /tools/training.html 的
 * 「歷次研習講義」時間軸清單補一筆連結即可，不用改 [code].js 的邏輯。
 * 密碼固定用 6 位數字（Steve 2026-09-17 定案，方便現場唸給學員聽）。
 */
// 講師專屬密碼：不管哪一場代碼都能用這組直接進去，答對場次自己的口令
// 或這組都算過。跟每場口令分開存，改這組不會動到任何一場的資料。
export const MASTER_PASSWORD = 'hung5407';

export const GO_SESSIONS = {
  '0916': {
    label: '吳鳳科技大學 AI 研習：用白話文寫程式（Vibe Coding）',
    password: '268655',
    url: 'https://docs.google.com/document/d/1c9gPS51ePnZgBLQ4DSu40zmttUFnJP6F0SxR08IHf9I/edit?usp=drive_link',
  },
};
