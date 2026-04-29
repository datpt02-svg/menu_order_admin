"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, Edit, Plus, Save, Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  deleteStaffAssignmentAction,
  deleteStaffMemberAction,
  deleteStaffShiftAction,
  saveStaffAssignmentVoidAction,
  saveStaffMemberAction,
  saveStaffShiftAction,
  toggleStaffStatusAction,
} from "@/app/(admin)/actions";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/admin/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";

type StaffItem = {
  id: number;
  code: string;
  fullName: string;
  phone: string;
  role: string;
  status: string;
  notes?: string | null;
  preferredZoneName?: string | null;
};

type ShiftItem = {
  id: number;
  shiftDate: string;
  startTime: string;
  endTime: string;
  label: string;
  zoneName?: string | null;
  headcountRequired?: number | null;
  notes?: string | null;
};

type AssignmentItem = {
  id: number;
  staffMemberId: number;
  staffShiftId: number;
  staffFullName: string;
  staffRole: string;
  shiftLabel: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  shiftZoneName?: string | null;
  assignmentRole?: string | null;
  status: string;
  notes?: string | null;
};

type ZoneItem = {
  id: number;
  slug: string;
  name: string;
};

type StaffContentProps = {
  initialData: {
    staffList: StaffItem[];
    shiftList: ShiftItem[];
    assignmentList: AssignmentItem[];
    zoneList: ZoneItem[];
  };
};

type StaffStatus = "active" | "inactive";

function getStaffStatusLabel(status: string): string {
  if (status === "active") return "Đang hoạt động";
  return "Tạm nghỉ";
}

function getStaffStatusTone(status: string) {
  return status === "active" ? "success" as const : "warning" as const;
}

const staffStatusOptions: Array<{ value: StaffStatus; label: string }> = [
  { value: "active", label: "Đang hoạt động" },
  { value: "inactive", label: "Tạm nghỉ" },
];

function StaffStatusDropdown({
  staff,
  isPending,
  onUpdate,
}: {
  staff: StaffItem;
  isPending: boolean;
  onUpdate: (id: number, status: StaffStatus) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const details = detailsRef.current;
      if (!details?.open) return;
      if (event.target instanceof Node && details.contains(event.target)) return;
      details.open = false;
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const currentStatus = (staff.status === "active" || staff.status === "inactive") ? staff.status : "inactive";

  return (
    <details ref={detailsRef} className="group relative shrink-0">
      <summary className="list-none marker:hidden [&::-webkit-details-marker]:hidden">
        <Badge
          tone={getStaffStatusTone(currentStatus)}
          className={cn(
            "cursor-pointer transition-opacity duration-200 hover:opacity-90 whitespace-nowrap",
            isPending && "pointer-events-none opacity-60",
          )}
        >
          {getStaffStatusLabel(currentStatus)}
        </Badge>
      </summary>
      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 hidden min-w-[180px] rounded-[20px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.96)] p-2 shadow-[0_18px_36px_rgba(24,51,33,0.16)] backdrop-blur group-open:block">
        <div className="space-y-1">
          {staffStatusOptions.map((option) => {
            const isActive = option.value === currentStatus;
            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-left text-sm font-semibold text-[var(--forest-dark)] transition-colors duration-200",
                  isActive ? "bg-[rgba(63,111,66,0.10)] text-[var(--forest)]" : "hover:bg-[var(--panel)]",
                )}
                disabled={isPending || isActive}
                onClick={() => {
                  detailsRef.current?.removeAttribute("open");
                  onUpdate(staff.id, option.value);
                }}
              >
                <span>{option.label}</span>
                {isActive ? <Check className="h-4 w-4" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
}

function getRoleLabel(role: string) {
  if (role === "manager") return "Quản lý";
  if (role === "service") return "Phục vụ";
  if (role === "kitchen") return "Bếp";
  if (role === "cashier") return "Thu ngân";
  return "Hỗ trợ";
}


function getAssignmentTone(status: string) {
  if (status === "confirmed") return "success" as const;
  if (status === "absent") return "danger" as const;
  return "info" as const;
}

export function StaffContent({ initialData }: StaffContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { staffList, shiftList, assignmentList, zoneList } = initialData;

  // Modal states
  const [activeModal, setActiveModal] = useState<"staff" | "shift" | "assignment" | null>(null);
  const [selectedItem, setSelectedItem] = useState<StaffItem | ShiftItem | AssignmentItem | null>(null);

  const staff = activeModal === "staff" ? selectedItem as StaffItem : null;
  const shift = activeModal === "shift" ? selectedItem as ShiftItem : null;
  const assignment = activeModal === "assignment" ? selectedItem as AssignmentItem : null;
  
  // Delete confirm state
  const [statusPendingId, setStatusPendingId] = useState<number | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; type: "staff" | "shift" | "assignment" } | null>(null);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [preferredZoneFilter, setPreferredZoneFilter] = useState("all");

  const selectedZoneName = useMemo(
    () => zoneList.find((zone) => zone.slug === preferredZoneFilter)?.name ?? null,
    [preferredZoneFilter, zoneList],
  );

  const filteredStaffList = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return staffList.filter((staff) => {
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        staff.fullName.toLowerCase().includes(normalizedKeyword) ||
        staff.code.toLowerCase().includes(normalizedKeyword) ||
        staff.phone.toLowerCase().includes(normalizedKeyword);
      const matchesRole = roleFilter === "all" || staff.role === roleFilter;
      const matchesStatus = statusFilter === "all" || staff.status === statusFilter;
      const matchesPreferredZone =
        preferredZoneFilter === "all" ||
        (selectedZoneName !== null && staff.preferredZoneName === selectedZoneName);

      return matchesKeyword && matchesRole && matchesStatus && matchesPreferredZone;
    });
  }, [keyword, preferredZoneFilter, roleFilter, selectedZoneName, staffList, statusFilter]);

  const handleEdit = (type: "staff" | "shift" | "assignment", item: StaffItem | ShiftItem | AssignmentItem) => {
    setSelectedItem(item);
    setActiveModal(type);
  };

  const handleStatusUpdate = (id: number, status: StaffStatus) => {
    setStatusPendingId(id);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", String(id));
      formData.append("active", status === "active" ? "true" : "");
      await toggleStaffStatusAction(formData);
      setStatusPendingId(null);
      router.refresh();
    });
  };

  const handleAdd = (type: "staff" | "shift" | "assignment") => {
    setSelectedItem(null);
    setActiveModal(type);
  };

  const confirmDelete = (id: number, type: "staff" | "shift" | "assignment") => {
    setDeleteTarget({ id, type });
    setIsDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", String(deleteTarget.id));

      if (deleteTarget.type === "staff") await deleteStaffMemberAction(formData);
      else if (deleteTarget.type === "shift") await deleteStaffShiftAction(formData);
      else if (deleteTarget.type === "assignment") await deleteStaffAssignmentAction(formData);

      setIsDeleteConfirmOpen(false);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <SectionHeading title="Bộ lọc nhanh" description="Tập trung vào vai trò, trạng thái và khu vực ưu tiên để điều phối ca nhanh ngay trong nội bộ quán." />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <FieldLabel>Từ khóa</FieldLabel>
              <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tên / mã / số điện thoại" />
            </div>
            <div>
              <FieldLabel>Vai trò</FieldLabel>
              <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="all">Tất cả vai trò</option>
                <option value="manager">Quản lý</option>
                <option value="service">Phục vụ</option>
                <option value="kitchen">Bếp</option>
                <option value="cashier">Thu ngân</option>
                <option value="support">Hỗ trợ</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Trạng thái</FieldLabel>
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm nghỉ</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Khu vực ưu tiên</FieldLabel>
              <Select value={preferredZoneFilter} onChange={(event) => setPreferredZoneFilter(event.target.value)}>
                <option value="all">Tất cả khu vực</option>
                {zoneList.map((zone) => (
                  <option key={zone.id} value={zone.slug}>{zone.name}</option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {/* Block 1: Danh sách nhân viên */}
        <Card>
          <CardContent>
            <SectionHeading
              title="Danh sách nhân viên"
              description="Chỉ cần đủ thông tin vận hành để phân ca, bật/tắt active và đưa vào calendar staffing."
              actions={
                <Button onClick={() => handleAdd("staff")}>
                  <Plus className="h-4 w-4" />
                  Thêm nhân viên
                </Button>
              }
            />
            <div className="mb-3 text-sm font-medium text-[var(--muted)]">
              {filteredStaffList.length} / {staffList.length} nhân viên
            </div>
            <div className="overflow-x-auto admin-scrollbar">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--line)] text-left text-[var(--muted)]">
                    <th className="pb-3 font-semibold">Mã</th>
                    <th className="pb-3 font-semibold">Nhân viên</th>
                    <th className="pb-3 font-semibold">Vai trò</th>
                    <th className="pb-3 font-semibold">Khu vực ưu tiên</th>
                    <th className="pb-3 font-semibold">Trạng thái</th>
                    <th className="pb-3 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaffList.length > 0 ? (
                    filteredStaffList.map((staff) => (
                      <tr key={staff.id} className="border-b border-[color:rgba(63,111,66,0.08)] last:border-0 hover:bg-white/40">
                        <td className="py-4 pr-4 font-semibold text-[var(--forest-dark)]">{staff.code}</td>
                        <td className="py-4 pr-4">
                          <div className="font-semibold text-[var(--forest-dark)]">{staff.fullName}</div>
                          <div className="text-[var(--muted)]">{staff.phone}</div>
                        </td>
                        <td className="py-4 pr-4 text-[var(--forest)]">{getRoleLabel(staff.role)}</td>
                        <td className="py-4 pr-4 text-[var(--muted)]">{staff.preferredZoneName ?? "Linh hoạt"}</td>
                        <td className="py-4">
                          <StaffStatusDropdown
                            staff={staff}
                            isPending={statusPendingId === staff.id}
                            onUpdate={handleStatusUpdate}
                          />
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon-sm" onClick={() => handleEdit("staff", staff)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => confirmDelete(staff.id, "staff")}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-[var(--muted)]">
                        Không có nhân viên nào khớp bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Block 2: Ca làm gần nhất */}
        <Card>
          <CardContent>
            <SectionHeading 
              title="Ca làm gần nhất" 
              description="Thiết lập các ca cơ bản trước khi kéo-thả staff thật trên calendar." 
              actions={
                <Button onClick={() => handleAdd("shift")}>
                  <Plus className="h-4 w-4" />
                  Thêm ca làm
                </Button>
              }
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {shiftList.map((shift) => (
                <div key={shift.id} className="group relative rounded-[18px] border border-[color:var(--line)] bg-white/60 p-4 transition-all hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[var(--forest-dark)]">{shift.label}</div>
                      <div className="mt-1 text-sm text-[var(--muted)]">{shift.shiftDate} · {shift.startTime} - {shift.endTime}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge tone="info">{shift.zoneName ?? "Toàn khu"}</Badge>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleEdit("shift", shift)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => confirmDelete(shift.id, "shift")}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-[var(--muted)]">Headcount yêu cầu: {shift.headcountRequired ?? 0}</div>
                  <div className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{shift.notes ?? "Chưa có ghi chú cho ca này."}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Block 3: Phân công hiện tại */}
        <Card>
          <CardContent>
            <SectionHeading 
              title="Phân công hiện tại" 
              description="Nhìn nhanh ai đang được gán vào ca nào trước khi chuyển sang thao tác lịch kéo-thả." 
              actions={
                <Button onClick={() => handleAdd("assignment")}>
                  <Plus className="h-4 w-4" />
                  Thêm phân công
                </Button>
              }
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {assignmentList.map((assignment) => (
                <div key={assignment.id} className="group relative rounded-[18px] border border-[color:var(--line)] bg-white/60 p-4 transition-all hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[var(--forest-dark)]">{assignment.staffFullName}</div>
                      <div className="mt-1 text-sm text-[var(--muted)]">{assignment.shiftLabel} · {assignment.shiftDate} · {assignment.startTime} - {assignment.endTime}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge tone={getAssignmentTone(assignment.status)}>{assignment.status}</Badge>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleEdit("assignment", assignment)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => confirmDelete(assignment.id, "assignment")}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-[var(--muted)]">
                    <span>{getRoleLabel(assignment.assignmentRole ?? assignment.staffRole)}</span>
                    <span>·</span>
                    <span>{assignment.shiftZoneName ?? "Toàn khu"}</span>
                  </div>
                  <div className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{assignment.notes ?? "Chưa có ghi chú phân công."}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Modal */}
      <Modal 
        isOpen={activeModal === "staff"} 
        onClose={() => setActiveModal(null)} 
        title={selectedItem ? "Sửa nhân viên" : "Thêm nhân viên mới"}
      >
        <form 
          action={async (formData) => {
            startTransition(async () => {
              await saveStaffMemberAction(formData);
              setActiveModal(null);
              router.refresh();
            });
          }} 
          className="space-y-4"
        >
          {selectedItem && <input type="hidden" name="id" value={selectedItem.id} />}
          <div>
            <FieldLabel>Mã nhân viên</FieldLabel>
            <Input name="code" defaultValue={staff?.code ?? ""} placeholder="Ví dụ: ST001" required />
          </div>
          <div>
            <FieldLabel>Họ tên</FieldLabel>
            <Input name="fullName" defaultValue={staff?.fullName ?? ""} placeholder="Nhập họ tên đầy đủ" required />
          </div>
          <div>
            <FieldLabel>Số điện thoại</FieldLabel>
            <Input name="phone" defaultValue={staff?.phone ?? ""} placeholder="Số điện thoại liên lạc" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Vai trò</FieldLabel>
              <Select name="role" defaultValue={staff?.role ?? "service"}>
                <option value="manager">Quản lý</option>
                <option value="service">Phục vụ</option>
                <option value="kitchen">Bếp</option>
                <option value="cashier">Thu ngân</option>
                <option value="support">Hỗ trợ</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Trạng thái</FieldLabel>
              <Select name="status" defaultValue={staff?.status ?? "active"}>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm nghỉ</option>
              </Select>
            </div>
          </div>
          <div>
            <FieldLabel>Khu vực ưu tiên</FieldLabel>
            <Select name="preferredZoneSlug" defaultValue={zoneList.find((z) => z.name === staff?.preferredZoneName)?.slug ?? "all"}>
              <option value="all">Linh hoạt</option>
              {zoneList.map((zone) => (
                <option key={zone.id} value={zone.slug}>{zone.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Ghi chú</FieldLabel>
            <Textarea name="notes" defaultValue={staff?.notes ?? ""} placeholder="Thông tin bổ sung (nếu có)..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setActiveModal(null)}>Hủy</Button>
            <Button type="submit" disabled={isPending}>
              <Save className="h-4 w-4" />
              {isPending ? "Đang lưu..." : "Lưu nhân viên"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Shift Modal */}
      <Modal 
        isOpen={activeModal === "shift"} 
        onClose={() => setActiveModal(null)} 
        title={selectedItem ? "Sửa ca làm" : "Thêm ca làm mới"}
      >
        <form 
          action={async (formData) => {
            startTransition(async () => {
              await saveStaffShiftAction(formData);
              setActiveModal(null);
              router.refresh();
            });
          }} 
          className="space-y-4"
        >
          {selectedItem && <input type="hidden" name="id" value={selectedItem.id} />}
          <div>
            <FieldLabel>Tên ca</FieldLabel>
            <Input name="label" defaultValue={shift?.label ?? "Ca mới"} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel>Ngày</FieldLabel>
              <Input name="shiftDate" type="date" defaultValue={shift?.shiftDate ?? new Date().toISOString().slice(0, 10)} required />
            </div>
            <div>
              <FieldLabel>Bắt đầu</FieldLabel>
              <Input name="startTime" type="time" defaultValue={shift?.startTime ?? "08:00"} required />
            </div>
            <div>
              <FieldLabel>Kết thúc</FieldLabel>
              <Input name="endTime" type="time" defaultValue={shift?.endTime ?? "16:00"} required />
            </div>
          </div>
          <div>
            <FieldLabel>Khu vực</FieldLabel>
            <Select name="zoneSlug" defaultValue={zoneList.find((z) => z.name === shift?.zoneName)?.slug ?? "all"}>
              <option value="all">Toàn khu</option>
              {zoneList.map((zone) => (
                <option key={zone.id} value={zone.slug}>{zone.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Headcount yêu cầu</FieldLabel>
            <Input name="headcountRequired" type="number" defaultValue={shift?.headcountRequired ?? 0} />
          </div>
          <div>
            <FieldLabel>Ghi chú</FieldLabel>
            <Textarea name="notes" defaultValue={shift?.notes ?? ""} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setActiveModal(null)}>Hủy</Button>
            <Button type="submit" disabled={isPending}>
              <Save className="h-4 w-4" />
              {isPending ? "Đang lưu..." : "Lưu ca"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assignment Modal */}
      <Modal 
        isOpen={activeModal === "assignment"} 
        onClose={() => setActiveModal(null)} 
        title={selectedItem ? "Sửa phân công" : "Thêm phân công mới"}
      >
        <form 
          action={async (formData) => {
            startTransition(async () => {
              try {
                await saveStaffAssignmentVoidAction(formData);
                setActiveModal(null);
                router.refresh();
              } catch (error) {
                alert(error instanceof Error ? error.message : "Có lỗi xảy ra");
              }
            });
          }} 
          className="space-y-4"
        >
          {selectedItem && <input type="hidden" name="id" value={selectedItem.id} />}
          <div>
            <FieldLabel>Nhân viên</FieldLabel>
            <Select name="staffMemberId" defaultValue={assignment?.staffMemberId ?? staffList[0]?.id}>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>{staff.fullName} · {staff.code}</option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Ca làm</FieldLabel>
            <Select name="staffShiftId" defaultValue={assignment?.staffShiftId ?? shiftList[0]?.id}>
              {shiftList.map((shift) => (
                <option key={shift.id} value={shift.id}>{shift.label} · {shift.shiftDate} · {shift.startTime} - {shift.endTime}</option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Vai trò áp dụng</FieldLabel>
              <Select name="assignmentRole" defaultValue={assignment?.assignmentRole ?? assignment?.staffRole ?? "service"}>
                <option value="manager">Quản lý</option>
                <option value="service">Phục vụ</option>
                <option value="kitchen">Bếp</option>
                <option value="cashier">Thu ngân</option>
                <option value="support">Hỗ trợ</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Trạng thái</FieldLabel>
              <Select name="status" defaultValue={assignment?.status ?? "assigned"}>
                <option value="assigned">Đã gán</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="absent">Vắng mặt</option>
              </Select>
            </div>
          </div>
          <div>
            <FieldLabel>Override khu vực</FieldLabel>
            <Select name="zoneSlug" defaultValue={zoneList.find((z) => z.name === assignment?.shiftZoneName)?.slug ?? "all"}>
              <option value="all">Theo ca / không override</option>
              {zoneList.map((zone) => (
                <option key={zone.id} value={zone.slug}>{zone.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Ghi chú</FieldLabel>
            <Textarea name="notes" defaultValue={assignment?.notes ?? ""} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setActiveModal(null)}>Hủy</Button>
            <Button type="submit" disabled={isPending}>
              <Save className="h-4 w-4" />
              {isPending ? "Đang lưu..." : "Lưu phân công"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Xác nhận xóa"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-[18px] bg-red-50 p-4 text-red-700">
            <AlertTriangle className="h-6 w-6" />
            <p className="font-semibold">
              Bạn có chắc chắn muốn xóa {
                deleteTarget?.type === "staff" ? "nhân viên" : 
                deleteTarget?.type === "shift" ? "ca làm" : 
                deleteTarget?.type === "assignment" ? "phân công" : "mục"
              } này?
            </p>
          </div>
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            Hành động này không thể hoàn tác. Dữ liệu liên quan sẽ bị ảnh hưởng.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)}>Hủy</Button>
            <Button type="button" variant="danger" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
