import ImportExcel from "@/components/admin/ImportExcel";

export default function AdminImportPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Excel импорт</h1>
      <p className="mt-0.5 text-sm text-muted">
        Excel эсвэл CSV файлаас мэдээлэл оруулах (сонголтоор)
      </p>
      <div className="mt-6">
        <ImportExcel />
      </div>
    </div>
  );
}
