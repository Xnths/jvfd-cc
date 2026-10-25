package research

import (
	"errors"
	"strings"
	"testing"
)

func TestDecodeOutlineTolerant(t *testing.T) {
	var ol Outline
	err := decodeModelJSON("```json\n"+`{"angle":["Primeira linha","Segunda"],"title_options":"Um título só","hook":{"text":"Gancho"},
		"sections":[{"heading":"H","points":"um ponto","sources":["1","[2]",3]},{"heading":"H2","points":["a",{"text":"b"}],"sources":2}],
		"example_scenario":null,"cautions":"Conferir"}`+"\n```", &ol)
	if err != nil {
		t.Fatal(err)
	}
	if string(ol.Angle) != "Primeira linha\nSegunda" || len(ol.TitleOptions) != 1 || ol.Hook != "Gancho" || ol.Cautions[0] != "Conferir" {
		t.Fatalf("%+v", ol)
	}
	if got := ol.Sections[0].Sources; len(got) != 3 || got[1] != 2 || ol.Sections[0].Points[0] != "um ponto" {
		t.Fatalf("sources %v", got)
	}
	if got := ol.Sections[1].Points; len(got) != 2 || got[1] != "b" || ol.Sections[1].Sources[0] != 2 {
		t.Fatalf("section 2 %+v", ol.Sections[1])
	}
}

func TestDecodeFinalDraftWithTextAround(t *testing.T) {
	var fd finalDraft
	if err := decodeModelJSON(`Aqui está: {"title":"T","blocks":[{"type":"p","text":"x"},{"type":"ul","items":"só um"}]} fim`, &fd); err != nil {
		t.Fatal(err)
	}
	if fd.Title != "T" || len(fd.Blocks) != 2 || fd.Blocks[1].Items[0] != "só um" {
		t.Fatalf("%+v", fd)
	}
}

func TestDecodeGarbageIsFormatError(t *testing.T) {
	var ol Outline
	err := decodeModelJSON("não é json", &ol)
	var fe *FormatError
	if !errors.As(err, &fe) || !strings.Contains(FriendlyError(err), "formato inesperado") {
		t.Fatalf("err = %v", err)
	}
}
