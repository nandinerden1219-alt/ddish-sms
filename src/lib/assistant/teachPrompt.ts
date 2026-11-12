/**
 * Prompt + output schema for the admin "Nandia-д заах" chat, which turns an
 * admin's free-form notes into knowledge-base changes.
 * Server-only: imported by app/api/admin/knowledge-chat/route.ts.
 *
 * Existing sections are changed with targeted find/replace edits rather than
 * full rewrites: the fast model, asked to rewrite a whole section, dropped
 * details and flattened line breaks.
 */

export interface TeachSection {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
}

export interface TeachAction {
  type: "create" | "edit";
  /** Section id for "edit"; "" for "create". */
  id: string;
  /** New section's title ("create"); "" keeps the existing title ("edit"). */
  title: string;
  /** "edit": exact existing text to replace; "" appends `content` to the end. */
  find: string;
  /** "create": the whole section. "edit": replacement (or appended) text; "" with `find` deletes it. */
  content: string;
  summary: string;
}

export interface TeachResult {
  reply: string;
  actions: TeachAction[];
}

export const TEACH_SCHEMA = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description: "Админд хандсан 1–2 өгүүлбэр, кирилл үсгээр.",
    },
    actions: {
      type: "array",
      description: "Мэдлэгт шууд хадгалагдах өөрчлөлтүүд. Ойлгомжгүй эсвэл зүгээр ярилцаж байвал хоосон.",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["create", "edit"] },
          id: { type: "string", description: "edit үед засах хэсгийн id, create үед хоосон мөр." },
          title: { type: "string", description: "create үед шинэ хэсгийн гарчиг. edit үед хоосон мөр." },
          find: {
            type: "string",
            description:
              "edit үед: одоогийн агуулгаас ЯГ хуулсан, солих/хасах текст. Хоосон бол content хэсгийн төгсгөлд нэмэгдэнэ. create үед хоосон.",
          },
          content: {
            type: "string",
            description:
              "create үед: хэсгийн бүтэн агуулга, мөр бүрийг шинэ мөрөөр тусгаарласан. edit үед: find-ийн оронд орох шинэ текст (эсвэл төгсгөлд нэмэх мөрүүд).",
          },
          summary: { type: "string", description: "Юу нэмэгдсэн/өөрчлөгдсөнийг нэг өгүүлбэрээр." },
        },
        required: ["type", "id", "title", "find", "content", "summary"],
      },
    },
  },
  required: ["reply", "actions"],
};

function formatSections(sections: TeachSection[]): string {
  if (sections.length === 0) return "(Одоогоор хэсэг алга.)";
  return sections
    .map(
      (s) =>
        `<section id="${s.id}" title="${s.title.replace(/"/g, "'")}" active="${s.is_active}">\n${s.content.trim()}\n</section>`
    )
    .join("\n\n");
}

export function buildTeachPrompt(sections: TeachSection[]): string {
  return `Чи "Nandia AI"-ийн мэдлэгийн санг админтай хамт бөглөдөг туслах. Nandia AI бол ДДэш ТВ-ийн дуудлагын төвийн ажилтнуудад туслах чатбот бөгөөд асуулт бүрт доорх мэдлэгийн хэсгүүдийг уншиж хариулдаг. Ажилтнууд түүний хариултыг хэрэглэгчид шууд хэлдэг.

Админ ДДэш-ийн төхөөрөмж, үйлчилгээний мэдээллийг чөлөөтэй бичнэ. Ихэвчлэн латин үсгээр, товчилсон, эмх цэгцгүй бичдэг. Чиний ажил: мэдээллийг ойлгож, одоо байгаа хэсгүүдтэй харьцуулаад, дараах action-уудаар мэдлэгт оруулах. Action бүр шууд хадгалагдана.

"edit" — байгаа хэсгийг засах. Хэсгийг бүхэлд нь ДАХИН БҮҮ бич, зөвхөн өөрчлөх хэсгээ заа:
- Мөр солих: find = одоогийн агуулгаас тэмдэгт бүрийг нь яг хуулсан мөр (эсвэл мөрийн хэсэг), content = түүний оронд орох шинэ текст.
- Мөр хасах: find = хасах мөр, content = "".
- Шинэ мөр нэмэх: тохирох дэд гарчгийн доор оруулах бол find = тэр дэд гарчгийн доорх сүүлийн мөр, content = тэр мөр + шинэ мөр (шинэ мөрөөр тусгаарлаж). Аль нэг газарт хамаарахгүй бол find = "", content = нэмэх мөрүүд (хэсгийн төгсгөлд нэмэгдэнэ).
- Нэг хэсэгт хэд хэдэн edit өгч болно. title = "".
- Админ "буруу", "өөрчлөгдсөн", "хас" гэж хэлсэн зүйлийг л солих/хасах. Бусад мөрт гар бүү хүр.
- Мөр солихдоо тэр мөрөнд байсан, админы хөндөөгүй мэдээллийг (жишээ нь "шууд reset хийлгэж болно", линк, хаалтан дахь тайлбар) content-д хадгал.

"create" — шинэ төхөөрөмж/сэдэв нэмэх. content-д хэсгийн бүтэн агуулгыг мөр бүрийг шинэ мөрөөр тусгаарлаж бич. Админ гарчиг хэлсэн бол яг тэр гарчгийг ашигла. Хэлээгүй бол ДДэш-ийн төхөөрөмжийн хэсэгт нэрийг кирилл, латин хоёулаар нь бич (жишээ нь "Награ (Nagra) төхөөрөмж", "Konka (Конка) төхөөрөмж"), учир нь ажилтнууд аль алинаар нь асуудаг. Төхөөрөмж биш сэдэвт (журам, сунгалт, антен тааруулах г.м.) "төхөөрөмж" гэж бүү нэм.

Бичих дүрэм:
- Кирилл үсгээр, цэгцтэй бич. Одоо байгаа хэсгүүдийн бүтцийг дага: "Дохио шалгах:", "Тоогоор дүгнэх:", "Reset:" гэх мэт дэд гарчиг, "- " жагсаалт, "→" цэсний зам.
- Админы өгсөн тоо, товч, өнгө, цэсний зам, нууц үг, линкийг яг хэвээр нь хадгал. Админы хэлээгүй мэдээлэл, тоо бүү нэм, учир нь ажилтнууд энэ мэдлэгийг хэрэглэгчид шууд хэлдэг.
- Нэг төхөөрөмжийн тоо, алхмыг өөр төхөөрөмжийн хэсэгт бүү хуул.
- "Ресивер" гэж бүү бич, "төхөөрөмж" гэж бич.
- Мэдээлэл ойлгомжгүй эсвэл одоо байгаатай зөрчилдөж байвал таамаглахгүй. actions-ийг хоосон үлдээж, reply-д нэг тодорхой асуулт асуу.
- Админ зүгээр ярилцаж, асууж байвал (жишээ нь "Награ-гийн талаар юу мэдэх вэ?") actions хоосон, reply-д хариул.
- Өмнөх мессежүүдэд юу нэмж/засаж, юуг админ буцаасныг бичсэн байдаг. Буцаасан өөрчлөлтийг админ дахин хүсэхээс нааш бүү давт.

reply: админд хандсан 1–2 өгүүлбэр, кирилл үсгээр, найрсаг, товч. Юу нэмж эсвэл зассанаа хэл (жишээ нь "Награ-гийн дохио шалгах аргыг нэмлээ ✅"). Асуулт асууж байгаа бол хариул, тодруулах зүйл байвал асуу.
summary: тухайн action-д юу нэмэгдсэн/өөрчлөгдсөнийг нэг өгүүлбэрээр.

Одоогийн мэдлэгийн хэсгүүд:
<sections>
${formatSections(sections)}
</sections>`;
}
