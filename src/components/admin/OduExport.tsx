import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Mapeamento das famílias de Odu
const ODU_FAMILIES = [
  { value: "all", label: "Todos os Odus (256)", range: [1, 256] },
  { value: "meji", label: "Meji (1-16)", range: [1, 16] },
  { value: "omo_ejiogbe", label: "Omo Èjì Ògbè (17-32)", range: [17, 32] },
  { value: "omo_oyeku", label: "Omo Òyèkú Méjì (33-48)", range: [33, 48] },
  { value: "omo_iwori", label: "Omo Ìwòrì Méjì (49-64)", range: [49, 64] },
  { value: "omo_odi", label: "Omo Òdí Méjì (65-80)", range: [65, 80] },
  { value: "omo_irosun", label: "Omo Ìrosùn Méjì (81-96)", range: [81, 96] },
  { value: "omo_owonrin", label: "Omo Òwónrín Méjì (97-112)", range: [97, 112] },
  { value: "omo_obara", label: "Omo Ọ̀bàrà Méjì (113-128)", range: [113, 128] },
  { value: "omo_okanran", label: "Omo Ọ̀kànràn Méjì (129-144)", range: [129, 144] },
  { value: "omo_ogunda", label: "Omo Ògúndá Méjì (145-160)", range: [145, 160] },
  { value: "omo_osa", label: "Omo Ọ̀sá Méjì (161-176)", range: [161, 176] },
  { value: "omo_ika", label: "Omo Ìká Méjì (177-192)", range: [177, 192] },
  { value: "omo_oturupon", label: "Omo Òtúrúpọ̀n Méjì (193-208)", range: [193, 208] },
  { value: "omo_otura", label: "Omo Òtúrá Méjì (209-224)", range: [209, 224] },
  { value: "omo_irete", label: "Omo Ìrẹ̀tẹ̀ Méjì (225-240)", range: [225, 240] },
  { value: "omo_ose", label: "Omo Ọ̀sẹ́ Méjì (241-256)", range: [241, 256] },
];

// Função para determinar a categoria baseada no número
const getCategory = (numero: number): string => {
  if (numero <= 16) return "meji";
  const family = ODU_FAMILIES.find(f => numero >= f.range[0] && numero <= f.range[1]);
  return family?.value || "unknown";
};

export default function OduExport() {
  const [selectedFamily, setSelectedFamily] = useState("all");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const family = ODU_FAMILIES.find(f => f.value === selectedFamily);
      if (!family) return;

      let query = supabase
        .from("odu")
        .select("numero, nome, texto_principal, verso, significado")
        .order("numero", { ascending: true });

      if (selectedFamily !== "all") {
        query = query.gte("numero", family.range[0]).lte("numero", family.range[1]);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("Nenhum Odu encontrado para exportar");
        return;
      }

      // Formatar dados no formato esperado
      const exportData = {
        odus: data.map(odu => ({
          nome: odu.nome,
          numero: odu.numero,
          categoria: getCategory(odu.numero),
          verso: odu.verso || "",
          texto_principal: odu.texto_principal || "",
          significado: odu.significado || ""
        }))
      };

      // Criar e baixar arquivo
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `odus_${selectedFamily}_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${data.length} Odus exportados com sucesso!`);
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar Odus");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Exportar Odus em JSON</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Selecione a Família</label>
          <Select value={selectedFamily} onValueChange={setSelectedFamily}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma família" />
            </SelectTrigger>
            <SelectContent>
              {ODU_FAMILIES.map(family => (
                <SelectItem key={family.value} value={family.value}>
                  {family.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleExport} disabled={loading} className="w-full">
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar JSON
        </Button>
      </CardContent>
    </Card>
  );
}
